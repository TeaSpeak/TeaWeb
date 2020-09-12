import {
    AbstractServerConnection,
    ServerCommand,
    SingleCommandHandler
} from "../connection/ConnectionBase";
import {tr} from "../i18n/localize";

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

export type ExplicitCommandHandler = (command: ServerCommand, consumed: boolean) => void | boolean;
export abstract class AbstractCommandHandlerBoss {
    readonly connection: AbstractServerConnection;
    protected command_handlers: AbstractCommandHandler[] = [];
    /* TODO: Timeout */
    protected single_command_handler: SingleCommandHandler[] = [];

    protected explicitHandlers: {[key: string]:ExplicitCommandHandler[]} = {};

    protected constructor(connection: AbstractServerConnection) {
        this.connection = connection;
    }

    destroy() {
        this.command_handlers = undefined;
        this.single_command_handler = undefined;
    }

    register_explicit_handler(command: string, callback: ExplicitCommandHandler) {
        this.explicitHandlers[command] = this.explicitHandlers[command] || [];
        this.explicitHandlers[command].push(callback);

        return () => this.explicitHandlers[command].remove(callback);
    }

    unregister_explicit_handler(command: string, callback: ExplicitCommandHandler) {
        if(!this.explicitHandlers[command])
            return false;

        this.explicitHandlers[command].remove(callback);
        return true;
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
        if(typeof handler.command === "string")
            handler.command = [handler.command];
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
                    flag_consumed = handler.handle_command(command) || flag_consumed;
            } catch(error) {
                console.error(tr("Failed to invoke command handler. Invocation results in an exception: %o"), error);
            }
        }

        const explHandlers = this.explicitHandlers[command.command];
        if(Array.isArray(explHandlers)) {
            for(const handler of explHandlers) {
                try {
                    flag_consumed = handler(command, flag_consumed) || flag_consumed;
                } catch(error) {
                    console.error(tr("Failed to invoke command handler. Invocation results in an exception: %o"), error);
                }
            }
        }

        for(const handler of [...this.single_command_handler]) {
            // We already know that handler.command must be an array (It will be converted within the register single handler methode)
            if(handler.command && (handler.command as string[]).findIndex(e => e === command.command) == -1)
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