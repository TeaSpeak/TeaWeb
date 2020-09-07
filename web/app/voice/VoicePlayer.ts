import {
    VoicePlayer,
    VoicePlayerEvents,
    VoicePlayerLatencySettings,
    VoicePlayerState
} from "tc-shared/voice/VoicePlayer";
import {AudioClient} from "tc-backend/web/audio-lib/AudioClient";
import {AudioResampler} from "./AudioResampler";
import {Registry} from "tc-shared/events";
import * as aplayer from "tc-backend/web/audio/player";
import {getAudioLibrary} from "tc-backend/web/audio-lib";
import {LogCategory, logDebug, logError, logWarn} from "tc-shared/log";

const kDefaultLatencySettings = {
    minBufferTime: 60,
    maxBufferTime: 400
} as VoicePlayerLatencySettings;

export class WebVoicePlayer implements VoicePlayer {
    public readonly events: Registry<VoicePlayerEvents>;

    private speakerContext: AudioContext;
    private gainNode: GainNode;

    private playerState = VoicePlayerState.STOPPED;

    private currentPlaybackTime: number = 0;
    private bufferTimeout: number;

    private bufferQueueTime: number = 0;
    private bufferQueue: AudioBuffer[] = [];
    private playingNodes: AudioBufferSourceNode[] = [];

    private currentVolume: number = 1;
    private latencySettings: VoicePlayerLatencySettings;

    private audioInitializePromise: Promise<void>;
    private audioClient: AudioClient;
    private resampler: AudioResampler;

    constructor() {
        this.events = new Registry<VoicePlayerEvents>();

        this.resampler = new AudioResampler(48000);
        aplayer.on_ready(() => {
            this.speakerContext = aplayer.context();
            this.gainNode = aplayer.context().createGain();
            this.gainNode.connect(this.speakerContext.destination);
            this.gainNode.gain.value = this.currentVolume;
            this.initializeAudio();
        });

        this.resetLatencySettings();
        this.setPlayerState(VoicePlayerState.STOPPED);
    }

    abortReplay() {
        this.stopAudio(true);
    }

    flushBuffer() {
        this.bufferQueue = [];
        this.bufferQueueTime = 0;

        for(const entry of this.playingNodes) {
            entry.stop(0);
        }
        this.playingNodes = [];
    }

    getState(): VoicePlayerState {
        return undefined;
    }

    getVolume(): number {
        return this.currentVolume;
    }

    setVolume(volume: number) {
        if(this.currentVolume == volume) {
            return;
        }

        this.currentVolume = volume;
        if(this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    getLatencySettings(): Readonly<VoicePlayerLatencySettings> {
        return this.latencySettings;
    }

    setLatencySettings(settings: VoicePlayerLatencySettings) {
        this.latencySettings = settings
    }

    resetLatencySettings() {
        this.latencySettings = kDefaultLatencySettings;
    }

    enqueueAudioPacket(packetId: number, codec: number, head: boolean, buffer: Uint8Array) {
        if(!this.audioClient) {
            return;
        } else {

            this.initializeAudio().then(() => {
                if(!this.audioClient) {
                    /* we've already been destroyed */
                    return;
                }

                this.audioClient.enqueueBuffer(buffer, packetId, codec, head);
            });
        }
    }

    destroy() {
        this.audioClient?.destroy();
        this.audioClient = undefined;
    }

    private initializeAudio() : Promise<void> {
        if(this.audioInitializePromise) {
            return this.audioInitializePromise;
        }

        this.audioInitializePromise = (async () => {
            this.audioClient = await getAudioLibrary().createClient();
            this.audioClient.callback_decoded = buffer => {
                this.resampler.resample(buffer).then(buffer => {
                    this.playbackAudioBuffer(buffer);
                });
            }
            this.audioClient.callback_ended = () => {
                this.stopAudio(false);
            };
        })();
        return this.audioInitializePromise;
    }

    playbackAudioBuffer(buffer: AudioBuffer) {
        if(!buffer) {
            logWarn(LogCategory.VOICE, tr("[AudioController] Got empty or undefined buffer! Dropping it"));
            return;
        }

        if(!this.speakerContext) {
            logWarn(LogCategory.VOICE, tr("[AudioController] Failed to replay audio. Global audio context not initialized yet!"));
            return;
        }

        if (buffer.sampleRate != this.speakerContext.sampleRate) {
            logWarn(LogCategory.VOICE, tr("[AudioController] Source sample rate isn't equal to playback sample rate! (%o | %o)"), buffer.sampleRate, this.speakerContext.sampleRate);
        }

        if(this.playerState == VoicePlayerState.STOPPED || this.playerState == VoicePlayerState.STOPPING) {
            logDebug(LogCategory.VOICE, tr("[Audio] Starting new playback"));
            this.setPlayerState(VoicePlayerState.PREBUFFERING);
        }

        if(this.playerState === VoicePlayerState.PREBUFFERING || this.playerState === VoicePlayerState.BUFFERING) {
            this.resetBufferTimeout(true);
            this.bufferQueue.push(buffer);
            this.bufferQueueTime += buffer.duration;
            if(this.bufferQueueTime <= this.latencySettings.minBufferTime / 1000) {
                return;
            }

            /* finished buffering */
            if(this.playerState == VoicePlayerState.PREBUFFERING) {
                logDebug(LogCategory.VOICE, tr("[Audio] Prebuffering succeeded (Replaying now)"));
            } else {
                logDebug(LogCategory.VOICE, tr("[Audio] Buffering succeeded (Replaying now)"));
            }

            this.gainNode.gain.value = 0;
            this.gainNode.gain.linearRampToValueAtTime(this.currentVolume, this.speakerContext.currentTime + .1);

            this.replayBufferQueue();
            this.setPlayerState(VoicePlayerState.PLAYING);
        } else if(this.playerState === VoicePlayerState.PLAYING) {
            const latency = this.getCurrentPlaybackLatency();
            if(latency > (this.latencySettings.maxBufferTime / 1000)) {
                logWarn(LogCategory.VOICE, tr("Dropping replay buffer because of too high replay latency. (Current: %f, Max: %f)"),
                    latency.toFixed(3), (this.latencySettings.maxBufferTime / 1000).toFixed(3));
                return;
            }
            this.enqueueBufferForPayback(buffer);
        } else {
            logError(LogCategory.AUDIO, tr("This block should be unreachable!"));
            return;
        }
    }

    getCurrentPlaybackLatency() {
        return Math.max(this.currentPlaybackTime - this.speakerContext.currentTime, 0);
    }

    stopAudio(abortPlayback: boolean) {
        if(abortPlayback) {
            this.setPlayerState(VoicePlayerState.STOPPED);
            this.flushBuffer();
        } else {
            this.setPlayerState(VoicePlayerState.STOPPING);

            /* replay all pending buffers */
            this.replayBufferQueue();

            /* test if there are any buffers which are currently played, if not the state will change to stopped */
            this.testReplayState();
        }
    }

    private replayBufferQueue() {
        for(const buffer of this.bufferQueue)
            this.enqueueBufferForPayback(buffer);
        this.bufferQueue = [];
        this.bufferQueueTime = 0;
    }

    private enqueueBufferForPayback(buffer: AudioBuffer) {
        /* advance the playback time index, we seem to be behind a bit */
        if(this.currentPlaybackTime < this.speakerContext.currentTime)
            this.currentPlaybackTime = this.speakerContext.currentTime;

        const player = this.speakerContext.createBufferSource();
        player.buffer = buffer;

        player.onended = () => this.handleBufferPlaybackEnded(player);
        this.playingNodes.push(player);

        player.connect(this.gainNode);
        player.start(this.currentPlaybackTime);

        this.currentPlaybackTime += buffer.duration;
    }

    private handleBufferPlaybackEnded(node: AudioBufferSourceNode) {
        this.playingNodes.remove(node);
        this.testReplayState();
    }

    private testReplayState() {
        if(this.bufferQueue.length > 0 || this.playingNodes.length > 0) {
            return;
        }

        if(this.playerState === VoicePlayerState.STOPPING) {
            /* All buffers have been replayed successfully */
            this.setPlayerState(VoicePlayerState.STOPPED);
        } else if(this.playerState === VoicePlayerState.PLAYING) {
            logDebug(LogCategory.VOICE, tr("Voice player has a buffer underflow. Changing state to buffering."));
            this.setPlayerState(VoicePlayerState.BUFFERING);
        }
    }

    /***
     * Schedule a new buffer timeout.
     * The buffer timeout is used to playback even small amounts of audio, which are less than the min. buffer size.
     * @param scheduleNewTimeout
     * @private
     */
    private resetBufferTimeout(scheduleNewTimeout: boolean) {
        clearTimeout(this.bufferTimeout);

        if(scheduleNewTimeout) {
            this.bufferTimeout = setTimeout(() => {
                if(this.playerState == VoicePlayerState.PREBUFFERING || this.playerState == VoicePlayerState.BUFFERING) {
                    logWarn(LogCategory.VOICE, tr("[Audio] Buffering exceeded timeout. Flushing and stopping replay."));
                    this.stopAudio(false);
                }
                this.bufferTimeout = undefined;
            }, 1000);
        }
    }

    private setPlayerState(state: VoicePlayerState) {
        if(this.playerState === state) {
            return;
        }

        const oldState = this.playerState;
        this.playerState = state;
        this.events.fire("notify_state_changed", {
            oldState: oldState,
            newState: state
        });
    }
}