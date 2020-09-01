import * as aplayer from "../audio/player";
import {LogCategory, logDebug, logError, logWarn} from "tc-shared/log";
import {LatencySettings, PlayerState, VoiceClient} from "tc-shared/connection/VoiceConnection";
import {AudioResampler} from "tc-backend/web/voice/AudioResampler";
import {AudioClient} from "tc-backend/web/audio-lib/AudioClient";
import {getAudioLibrary} from "tc-backend/web/audio-lib";
import {VoicePacket} from "tc-backend/web/voice/bridge/VoiceBridge";

export class VoiceClientController implements VoiceClient {
    callback_playback: () => any;
    callback_state_changed: (new_state: PlayerState) => any;
    callback_stopped: () => any;
    client_id: number;

    private speakerContext: AudioContext;
    private gainNode: GainNode;

    private playerState: PlayerState = PlayerState.STOPPED;

    private currentPlaybackTime: number = 0;
    private bufferTimeout: number;

    private bufferQueueTime: number = 0;
    private bufferQueue: AudioBuffer[] = [];
    private playingNodes: AudioBufferSourceNode[] = [];

    private currentVolume: number = 1;
    private latencySettings: LatencySettings;

    private audioInitializePromise: Promise<void>;
    private audioClient: AudioClient;
    private resampler: AudioResampler;

    constructor(client_id: number) {
        this.client_id = client_id;
        this.reset_latency_settings();

        this.resampler = new AudioResampler(48000);
        aplayer.on_ready(() => {
            this.speakerContext = aplayer.context();
            this.gainNode = aplayer.context().createGain();
            this.gainNode.connect(this.speakerContext.destination);
            this.gainNode.gain.value = this.currentVolume;
        });
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

    public enqueuePacket(packet: VoicePacket) {
        if(!this.audioClient && packet.payload.length === 0) {
            return;
        } else {
            this.initializeAudio().then(() => {
                if(!this.audioClient) {
                    /* we've already been destroyed */
                    return;
                }

                this.audioClient.enqueueBuffer(packet.payload, packet.voiceId, packet.codec);
            });
        }
    }

    public destroy() {
        this.audioClient?.destroy();
        this.audioClient = undefined;
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

        if(this.playerState == PlayerState.STOPPED || this.playerState == PlayerState.STOPPING) {
            logDebug(LogCategory.VOICE, tr("[Audio] Starting new playback"));
            this.setPlayerState(PlayerState.PREBUFFERING);
        }

        if(this.playerState === PlayerState.PREBUFFERING || this.playerState === PlayerState.BUFFERING) {
            this.resetBufferTimeout(true);
            this.bufferQueue.push(buffer);
            this.bufferQueueTime += buffer.duration;
            if(this.bufferQueueTime <= this.latencySettings.min_buffer / 1000) {
                return;
            }

            /* finished buffering */
            if(this.playerState == PlayerState.PREBUFFERING) {
                logDebug(LogCategory.VOICE, tr("[Audio] Prebuffering succeeded (Replaying now)"));
                if(this.callback_playback) {
                    this.callback_playback();
                }
            } else {
                logDebug(LogCategory.VOICE, tr("[Audio] Buffering succeeded (Replaying now)"));
            }

            this.replayBufferQueue();
            this.setPlayerState(PlayerState.PLAYING);
        } else if(this.playerState === PlayerState.PLAYING) {
            const latency = this.getCurrentPlaybackLatency();
            if(latency > (this.latencySettings.max_buffer / 1000)) {
                logWarn(LogCategory.VOICE, tr("Dropping replay buffer for client %d because of too high replay latency. (Current: %f, Max: %f)"),
                    this.client_id, latency.toFixed(3), (this.latencySettings.max_buffer / 1000).toFixed(3));
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
            this.setPlayerState(PlayerState.STOPPED);
            this.flush();
            if(this.callback_stopped) {
                this.callback_stopped();
            }
        } else {
            this.setPlayerState(PlayerState.STOPPING);

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

        if(this.playerState === PlayerState.STOPPING) {
            /* All buffers have been replayed successfully */
            this.setPlayerState(PlayerState.STOPPED);
            if(this.callback_stopped) {
                this.callback_stopped();
            }
        } else if(this.playerState === PlayerState.PLAYING) {
            logDebug(LogCategory.VOICE, tr("Client %d has a buffer underflow. Changing state to buffering."), this.client_id);
            this.setPlayerState(PlayerState.BUFFERING);
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
                if(this.playerState == PlayerState.PREBUFFERING || this.playerState == PlayerState.BUFFERING) {
                    logWarn(LogCategory.VOICE, tr("[Audio] Buffering exceeded timeout. Flushing and stopping replay."));
                    this.stopAudio(false);
                }
                this.bufferTimeout = undefined;
            }, 1000);
        }
    }

    private setPlayerState(state: PlayerState) {
        if(this.playerState === state) {
            return;
        }

        this.playerState = state;
        if(this.callback_state_changed) {
            this.callback_state_changed(this.playerState);
        }
    }

    get_state(): PlayerState {
        return this.playerState;
    }

    get_volume(): number {
        return this.currentVolume;
    }

    set_volume(volume: number): void {
        if(this.currentVolume == volume)
            return;

        this.currentVolume = volume;
        if(this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    abort_replay() {
        this.stopAudio(true);
    }

    support_flush(): boolean {
        return true;
    }

    flush() {
        this.bufferQueue = [];
        this.bufferQueueTime = 0;

        for(const entry of this.playingNodes) {
            entry.stop(0);
        }
        this.playingNodes = [];
    }

    latency_settings(settings?: LatencySettings): LatencySettings {
        if(typeof settings !== "undefined") {
            this.latencySettings = settings;
        }
        return this.latencySettings;
    }

    reset_latency_settings() {
        this.latencySettings = {
            min_buffer: 60,
            max_buffer: 400
        };
    }

    support_latency_settings(): boolean {
        return true;
    }
}