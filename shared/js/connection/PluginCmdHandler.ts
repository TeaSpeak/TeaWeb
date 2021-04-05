import {ConnectionHandler} from "../ConnectionHandler";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {AbstractCommandHandler} from "../connection/AbstractCommandHandler";
import {AbstractServerConnection, ServerCommand} from "../connection/ConnectionBase";
import { tra } from "tc-shared/i18n/localize";

export interface PluginCommandInvoker {
    clientId: number;
    clientUniqueId: string;
    clientName: string;
}

export abstract class PluginCmdHandler {
    protected readonly channel: string;
    protected currentServerConnection: AbstractServerConnection;

    protected constructor(channel: string) {
        this.channel = channel;
    }

    handleHandlerUnregistered() {}
    handleHandlerRegistered() {}

    getChannel() { return this.channel; }

    abstract handlePluginCommand(data: string, invoker: PluginCommandInvoker);

    protected sendPluginCommand(data: string, mode: "server" | "view" | "channel" | "private", clientOrChannelId?: number) : Promise<CommandResult> {
        if(!this.currentServerConnection) {
            throw "plugin command handler not registered";
        }

        let targetMode: number;
        switch (mode) {
            case "channel":
                targetMode = 0;
                break;

            case "server":
                targetMode = 1;
                break;

            case "private":
                targetMode = 2;
                break;

            case "view":
                targetMode = 3;
                break;

            default:
                throw tr("invalid plugin message target");
        }

        return this.currentServerConnection.send_command("plugincmd", {
            data: data,
            name: this.channel,
            targetmode: targetMode,
            target: clientOrChannelId
        });
    }
}

class PluginCmdRegistryCommandHandler extends AbstractCommandHandler {
    private readonly callback: (channel: string, data: string, invoker: PluginCommandInvoker) => void;

    constructor(connection, callback) {
        super(connection);
        this.callback = callback;
    }

    handle_command(command: ServerCommand): boolean {
        if(command.command !== "notifyplugincmd")
            return false;

        const channel = command.arguments[0]["name"];
        const payload = command.arguments[0]["data"];
        const invoker = {
            clientId: parseInt(command.arguments[0]["invokerid"]),
            clientUniqueId: command.arguments[0]["invokeruid"],
            clientName: command.arguments[0]["invokername"]
        } as PluginCommandInvoker;

        this.callback(channel, payload, invoker);

        return false;
    }
}

export class PluginCmdRegistry {
    readonly connection: ConnectionHandler;
    private readonly handler: PluginCmdRegistryCommandHandler;

    private handlerMap: {[key: string]: PluginCmdHandler} = {};

    constructor(connection: ConnectionHandler) {
        this.connection = connection;

        this.handler = new PluginCmdRegistryCommandHandler(connection.serverConnection, this.handlePluginCommand.bind(this));
        this.connection.serverConnection.command_handler_boss().register_handler(this.handler);
    }

    destroy() {
        this.connection.serverConnection.command_handler_boss().unregister_handler(this.handler);

        Object.keys(this.handlerMap).map(e => this.handlerMap[e]).forEach(handler => {
            handler["currentServerConnection"] = undefined;
            handler.handleHandlerUnregistered();
        });
        this.handlerMap = {};
    }

    registerHandler(handler: PluginCmdHandler) {
        if(this.handlerMap[handler.getChannel()] !== undefined) {
            throw tra("A handler for channel {} already exists", handler.getChannel());
        }

        this.handlerMap[handler.getChannel()] = handler;
        handler["currentServerConnection"] = this.connection.serverConnection;
        handler.handleHandlerRegistered();
    }

    unregisterHandler(handler: PluginCmdHandler) {
        if(this.handlerMap[handler.getChannel()] !== handler) {
            return;
        }

        handler["currentServerConnection"] = undefined;
        handler.handleHandlerUnregistered();
        delete this.handlerMap[handler.getChannel()];
    }

    private handlePluginCommand(channel: string, payload: string, invoker: PluginCommandInvoker) {
        const handler = this.handlerMap[channel] as PluginCmdHandler;
        handler?.handlePluginCommand(payload, invoker);
    }

    getPluginHandler<T extends PluginCmdHandler>(channel: string) : T | undefined {
        return this.handlerMap[channel] as T;
    }
}