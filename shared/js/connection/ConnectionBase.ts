namespace connection {
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

        export interface VoiceClient {
            client_id: number;

            callback_playback: () => any;
            callback_stopped: () => any;

            callback_state_changed: (new_state: PlayerState) => any;

            get_state() : PlayerState;

            get_volume() : number;
            set_volume(volume: number) : void;

            abort_replay();
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

    export abstract class AbstractCommandHandler {
        readonly connection: AbstractServerConnection;

        handler_boss: AbstractCommandHandlerBoss | undefined;
        volatile_handler_boss: boolean = false; /* if true than the command handler could be registered twice to two or more handlers */

        ignore_consumed: boolean = false;

        protected constructor(connection: AbstractServerConnection) {
            this.connection = connection;
        }

        /**
         * @return If the command should be consumed
         */
        abstract handle_command(command: ServerCommand) : boolean;
    }

    export interface SingleCommandHandler {
        name?: string;
        command?: string;
        timeout?: number;

        /* if the return is true then the command handler will be removed */
        function: (command: ServerCommand) => boolean;
    }

    export abstract class AbstractCommandHandlerBoss {
        readonly connection: AbstractServerConnection;
        protected command_handlers: AbstractCommandHandler[] = [];
        /* TODO: Timeout */
        protected single_command_handler: SingleCommandHandler[] = [];

        protected constructor(connection: AbstractServerConnection) {
            this.connection = connection;
        }

        destroy() {
            this.command_handlers = undefined;
            this.single_command_handler = undefined;
        }

        register_handler(handler: AbstractCommandHandler) {
            if(!handler.volatile_handler_boss && handler.handler_boss)
                throw "handler already registered";

            this.command_handlers.remove(handler); /* just to be sure */
            this.command_handlers.push(handler);
            handler.handler_boss = this;
        }

        unregister_handler(handler: AbstractCommandHandler) {
            if(!handler.volatile_handler_boss && handler.handler_boss !== this) {
                console.warn(tr("Tried to unregister command handler which does not belong to the handler boss"));
                return;
            }

            this.command_handlers.remove(handler);
            handler.handler_boss = undefined;
        }


        register_single_handler(handler: SingleCommandHandler) {
            this.single_command_handler.push(handler);
        }

        remove_single_handler(handler: SingleCommandHandler) {
            this.single_command_handler.remove(handler);
        }

        handlers() : AbstractCommandHandler[] {
            return this.command_handlers;
        }

        invoke_handle(command: ServerCommand) : boolean {
            let flag_consumed = false;

            for(const handler of this.command_handlers) {
                try {
                    if(!flag_consumed || handler.ignore_consumed)
                        flag_consumed = flag_consumed || handler.handle_command(command);
                } catch(error) {
                    console.error(tr("Failed to invoke command handler. Invocation results in an exception: %o"), error);
                }
            }

            for(const handler of [...this.single_command_handler]) {
                if(handler.command && handler.command != command.command)
                    continue;

                try {
                    if(handler.function(command))
                        this.single_command_handler.remove(handler);
                } catch(error) {
                    console.error(tr("Failed to invoke single command handler. Invocation results in an exception: %o"), error);
                }
            }

            return flag_consumed;
        }
    }
}