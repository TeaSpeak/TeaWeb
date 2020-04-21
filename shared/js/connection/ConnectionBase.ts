import {CommandHelper} from "tc-shared/connection/CommandHelper";
import {HandshakeHandler} from "tc-shared/connection/HandshakeHandler";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ServerAddress} from "tc-shared/ui/server";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {AbstractCommandHandlerBoss} from "tc-shared/connection/AbstractCommandHandler";

export interface CommandOptions {
    flagset?: string[]; /* default: [] */
    process_result?: boolean; /* default: true */

    timeout?: number /* default: 1000 */;
}
export const CommandOptionDefaults: CommandOptions = {
    flagset: [],
    process_result: true,
    timeout: 1000
};

export type ConnectionStateListener = (old_state: ConnectionState, new_state: ConnectionState) => any;
export abstract class AbstractServerConnection {
    readonly client: ConnectionHandler;
    readonly command_helper: CommandHelper;
    protected connection_state_: ConnectionState = ConnectionState.UNCONNECTED;

    protected constructor(client: ConnectionHandler) {
        this.client = client;

        this.command_helper = new CommandHelper(this);
    }

    /* resolved as soon a connection has been established. This does not means that the authentication had yet been done! */
    abstract connect(address: ServerAddress, handshake: HandshakeHandler, timeout?: number) : Promise<void>;

    abstract connected() : boolean;
    abstract disconnect(reason?: string) : Promise<void>;

    abstract support_voice() : boolean;
    abstract voice_connection() : voice.AbstractVoiceConnection | undefined;

    abstract command_handler_boss() : AbstractCommandHandlerBoss;
    abstract send_command(command: string, data?: any | any[], options?: CommandOptions) : Promise<CommandResult>;

    abstract get onconnectionstatechanged() : ConnectionStateListener;
    abstract set onconnectionstatechanged(listener: ConnectionStateListener);

    abstract remote_address() : ServerAddress; /* only valid when connected */
    abstract handshake_handler() : HandshakeHandler; /* only valid when connected */

    //FIXME: Remove this this is currently only some kind of hack
    updateConnectionState(state: ConnectionState) {
        if(state === this.connection_state_) return;

        const old_state = this.connection_state_;
        this.connection_state_ = state;
        if(this.onconnectionstatechanged)
            this.onconnectionstatechanged(old_state, state);
    }

    abstract ping() : {
        native: number,
        javascript?: number
    };
}

export namespace voice {
    export enum PlayerState {
        PREBUFFERING,
        PLAYING,
        BUFFERING,
        STOPPING,
        STOPPED
    }

    export type LatencySettings = {
        min_buffer: number; /* milliseconds */
        max_buffer: number; /* milliseconds */
    }

    export interface VoiceClient {
        client_id: number;

        callback_playback: () => any;
        callback_stopped: () => any;

        callback_state_changed: (new_state: PlayerState) => any;

        get_state() : PlayerState;

        get_volume() : number;
        set_volume(volume: number) : void;

        abort_replay();

        support_latency_settings() : boolean;

        reset_latency_settings();
        latency_settings(settings?: LatencySettings) : LatencySettings;

        support_flush() : boolean;
        flush();
    }

    export abstract class AbstractVoiceConnection {
        readonly connection: AbstractServerConnection;

        protected constructor(connection: AbstractServerConnection) {
            this.connection = connection;
        }

        abstract connected() : boolean;
        abstract encoding_supported(codec: number) : boolean;
        abstract decoding_supported(codec: number) : boolean;

        abstract register_client(client_id: number) : VoiceClient;
        abstract available_clients() : VoiceClient[];
        abstract unregister_client(client: VoiceClient) : Promise<void>;

        abstract voice_recorder() : RecorderProfile;
        abstract acquire_voice_recorder(recorder: RecorderProfile | undefined) : Promise<void>;

        abstract get_encoder_codec() : number;
        abstract set_encoder_codec(codec: number);
    }
}

export class ServerCommand {
    command: string;
    arguments: any[];
}

export interface SingleCommandHandler {
    name?: string;
    command?: string | string[];
    timeout?: number;

    /* if the return is true then the command handler will be removed */
    function: (command: ServerCommand) => boolean;
}