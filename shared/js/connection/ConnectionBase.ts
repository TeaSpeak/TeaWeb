import {CommandHelper} from "../connection/CommandHelper";
import {HandshakeHandler} from "../connection/HandshakeHandler";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {ServerAddress} from "../tree/Server";
import {ConnectionHandler, ConnectionState} from "../ConnectionHandler";
import {AbstractCommandHandlerBoss} from "../connection/AbstractCommandHandler";
import {Registry} from "../events";
import {AbstractVoiceConnection} from "../connection/VoiceConnection";

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

export interface ServerConnectionEvents {
    notify_connection_state_changed: {
        oldState: ConnectionState,
        newState: ConnectionState
    }
}

export type ConnectionStateListener = (old_state: ConnectionState, new_state: ConnectionState) => any;
export abstract class AbstractServerConnection {
    readonly events: Registry<ServerConnectionEvents>;

    readonly client: ConnectionHandler;
    readonly command_helper: CommandHelper;
    protected connectionState: ConnectionState = ConnectionState.UNCONNECTED;

    protected constructor(client: ConnectionHandler) {
        this.events = new Registry<ServerConnectionEvents>();
        this.client = client;

        this.command_helper = new CommandHelper(this);
    }

    /* resolved as soon a connection has been established. This does not means that the authentication had yet been done! */
    abstract connect(address: ServerAddress, handshake: HandshakeHandler, timeout?: number) : Promise<void>;

    abstract connected() : boolean;
    abstract disconnect(reason?: string) : Promise<void>;

    abstract getVoiceConnection() : AbstractVoiceConnection;

    abstract command_handler_boss() : AbstractCommandHandlerBoss;
    abstract send_command(command: string, data?: any | any[], options?: CommandOptions) : Promise<CommandResult>;

    abstract remote_address() : ServerAddress; /* only valid when connected */
    connectionProxyAddress() : ServerAddress | undefined { return undefined; };

    abstract handshake_handler() : HandshakeHandler; /* only valid when connected */

    //FIXME: Remove this this is currently only some kind of hack
    updateConnectionState(state: ConnectionState) {
        if(state === this.connectionState) return;

        const oldState = this.connectionState;
        this.connectionState = state;
        this.events.fire("notify_connection_state_changed", { oldState: oldState, newState: state });
    }

    getConnectionState() { return this.connectionState; }

    abstract ping() : {
        native: number,
        javascript?: number
    };
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