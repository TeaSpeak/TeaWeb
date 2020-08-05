import {voice} from "tc-shared/connection/ConnectionBase";
import VoiceClient = voice.VoiceClient;
import PlayerState = voice.PlayerState;
import {CodecClientCache} from "../codec/Codec";
import * as aplayer from "../audio/player";
import {LogCategory} from "tc-shared/log";
import * as log from "tc-shared/log";
import LatencySettings = voice.LatencySettings;

export class VoiceClientController implements VoiceClient {
    callback_playback: () => any;
    callback_state_changed: (new_state: PlayerState) => any;
    callback_stopped: () => any;
    client_id: number;

    speakerContext: AudioContext;
    private _player_state: PlayerState = PlayerState.STOPPED;
    private _codecCache: CodecClientCache[] = [];

    private _time_index: number = 0;
    private _latency_buffer_length: number = 3;
    private _buffer_timeout: number;

    private _buffered_samples: AudioBuffer[] = [];
    private _playing_nodes: AudioBufferSourceNode[] = [];

    private _volume: number = 1;
    allowBuffering: boolean = true;

    constructor(client_id: number) {
        this.client_id = client_id;

        aplayer.on_ready(() => this.speakerContext = aplayer.context());
    }

    public initialize() { }

    public close(){ }

    playback_buffer(buffer: AudioBuffer) {
        if(!buffer) {
            log.warn(LogCategory.VOICE, tr("[AudioController] Got empty or undefined buffer! Dropping it"));
            return;
        }

        if(!this.speakerContext) {
            log.warn(LogCategory.VOICE, tr("[AudioController] Failed to replay audio. Global audio context not initialized yet!"));
            return;
        }

        if (buffer.sampleRate != this.speakerContext.sampleRate)
            log.warn(LogCategory.VOICE, tr("[AudioController] Source sample rate isn't equal to playback sample rate! (%o | %o)"), buffer.sampleRate, this.speakerContext.sampleRate);

        this.apply_volume_to_buffer(buffer);

        this._buffered_samples.push(buffer);
        if(this._player_state == PlayerState.STOPPED || this._player_state == PlayerState.STOPPING) {
            log.info(LogCategory.VOICE, tr("[Audio] Starting new playback"));
            this.set_state(PlayerState.PREBUFFERING);
        }


        switch (this._player_state) {
            case PlayerState.PREBUFFERING:
            case PlayerState.BUFFERING:
                this.reset_buffer_timeout(true); //Reset timeout, we got a new buffer
                if(this._buffered_samples.length <= this._latency_buffer_length) {
                    if(this._player_state == PlayerState.BUFFERING) {
                        if(this.allowBuffering)
                            break;
                    } else
                        break;
                }
                if(this._player_state == PlayerState.PREBUFFERING) {
                    log.info(LogCategory.VOICE, tr("[Audio] Prebuffering succeeded (Replaying now)"));
                    if(this.callback_playback)
                        this.callback_playback();
                } else if(this.allowBuffering) {
                    log.info(LogCategory.VOICE, tr("[Audio] Buffering succeeded (Replaying now)"));
                }
                this._player_state = PlayerState.PLAYING;
            case PlayerState.PLAYING:
                this.replay_queue();
                break;
            default:
                break;
        }
    }

    private replay_queue() {
        let buffer: AudioBuffer;
        while((buffer = this._buffered_samples.pop_front())) {
            if(this._playing_nodes.length >= this._latency_buffer_length * 1.5 + 3) {
                log.info(LogCategory.VOICE, tr("Dropping buffer because playing queue grows to much"));
                continue; /* drop the data (we're behind) */
            }
            if(this._time_index < this.speakerContext.currentTime)
                this._time_index = this.speakerContext.currentTime;

            const player = this.speakerContext.createBufferSource();
            player.buffer = buffer;

            player.onended = () => this.on_buffer_replay_finished(player);
            this._playing_nodes.push(player);

            player.connect(aplayer.destination());
            player.start(this._time_index);
            this._time_index += buffer.duration;
        }
    }

    private on_buffer_replay_finished(node: AudioBufferSourceNode) {
        this._playing_nodes.remove(node);
        this.test_buffer_queue();
    }

    stopAudio(now: boolean = false) {
        this._player_state = PlayerState.STOPPING;
        if(now) {
            this._player_state = PlayerState.STOPPED;
            this._buffered_samples = [];

            for(const entry of this._playing_nodes)
                entry.stop(0);
            this._playing_nodes = [];

            if(this.callback_stopped)
                this.callback_stopped();
        } else {
            this.test_buffer_queue(); /* test if we're not already done */
            this.replay_queue(); /* flush the queue */
        }
    }

    private test_buffer_queue() {
        if(this._buffered_samples.length == 0 && this._playing_nodes.length == 0) {
            if(this._player_state != PlayerState.STOPPING && this._player_state != PlayerState.STOPPED) {
                if(this._player_state == PlayerState.BUFFERING)
                    return; //We're already buffering

                this._player_state = PlayerState.BUFFERING;
                if(!this.allowBuffering)
                    log.warn(LogCategory.VOICE, tr("[Audio] Detected a buffer underflow!"));
                this.reset_buffer_timeout(true);
            } else {
                this._player_state = PlayerState.STOPPED;
                if(this.callback_stopped)
                    this.callback_stopped();
            }
        }
    }

    private reset_buffer_timeout(restart: boolean) {
        if(this._buffer_timeout)
            clearTimeout(this._buffer_timeout);

        if(restart)
            this._buffer_timeout = setTimeout(() => {
                if(this._player_state == PlayerState.PREBUFFERING || this._player_state == PlayerState.BUFFERING) {
                    log.warn(LogCategory.VOICE, tr("[Audio] Buffering exceeded timeout. Flushing and stopping replay"));
                    this.stopAudio();
                }
                this._buffer_timeout = undefined;
            }, 1000);
    }

    private apply_volume_to_buffer(buffer: AudioBuffer) {
        if(this._volume == 1)
            return;

        for(let channel = 0; channel < buffer.numberOfChannels; channel++) {
            let data = buffer.getChannelData(channel);
            for(let sample = 0; sample < data.length; sample++) {
                let lane = data[sample];
                lane *= this._volume;
                data[sample] = lane;
            }
        }
    }

    private set_state(state: PlayerState) {
        if(this._player_state == state)
            return;

        this._player_state = state;
        if(this.callback_state_changed)
            this.callback_state_changed(this._player_state);
    }

    get_codec_cache(codec: number) : CodecClientCache {
        while(this._codecCache.length <= codec)
            this._codecCache.push(new CodecClientCache());

        return this._codecCache[codec];
    }

    get_state(): PlayerState {
        return this._player_state;
    }

    get_volume(): number {
        return this._volume;
    }

    set_volume(volume: number): void {
        if(this._volume == volume)
            return;

        this._volume = volume;

        /* apply the volume to all other buffers */
        for(const buffer of this._buffered_samples)
            this.apply_volume_to_buffer(buffer);
    }

    abort_replay() {
        this.stopAudio(true);
    }

    latency_settings(settings?: LatencySettings): LatencySettings {
        throw "not supported";
    }

    reset_latency_settings() {
        throw "not supported";
    }

    support_latency_settings(): boolean {
        return false;
    }

    support_flush(): boolean {
        return false;
    }

    flush() {
        throw "not supported";
    }
}