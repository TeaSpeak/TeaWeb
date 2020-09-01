import {CommandResponseType, ExecuteResult, GenericCommandMapping, GenericCommands, GenericNotify} from "./Definitions";
import {
    MessageContext,
    MessageHandler, NotifyHandler,
    WorkerMessage,
    WorkerMessageCommand, WorkerMessageCommandResponseError,
    WorkerMessageCommandResponseSuccess,
    WorkerMessageNotify
} from "./Protocol";

type PendingCommand = {
    timeout?: any,

    timestampSend: number,
    callbackResolve: (_: ExecuteResult) => void;
}

export interface WorkerEvents {
    notify_worker_died: {}
}

export abstract class WorkerCommunication<
    CommandsSend extends GenericCommands,
    CommandsReceive extends GenericCommands,
    CommandMapping extends GenericCommandMapping<CommandsSend, CommandsReceive>,
    NotifySend extends GenericNotify,
    NotifyReceive extends GenericNotify
> {
    private tokenIndex = 0;

    protected pendingCommands: {[key: string]: PendingCommand} = {};
    protected messageHandlers: {[key: string]: MessageHandler<any, any>} = {};
    protected notifyHandlers:  {[key: string]: NotifyHandler<any>} = {};
    protected constructor() { }

    registerMessageHandler<Command extends keyof CommandsReceive>(command: Command, handler: MessageHandler<CommandsReceive[Command], CommandResponseType<CommandsReceive, CommandsSend, CommandMapping, Command>>) {
        this.messageHandlers[command as any] = handler;
    }

    registerNotifyHandler<Notify extends keyof NotifyReceive>(notify: Notify, handler: NotifyHandler<NotifyReceive[Notify]>) {
        this.notifyHandlers[notify as any] = handler;
    }

    execute<T extends keyof CommandsSend>(
        command: T,
        data: CommandsSend[T],
        timeout?: number,
        transfer?: Transferable[]
    ) : Promise<ExecuteResult<CommandResponseType<CommandsSend, CommandsReceive, CommandMapping, T>>> {
        return new Promise<ExecuteResult>(resolve => {
            const token = this.tokenIndex++ + "_token";

            this.pendingCommands[token] = {
                timeout: typeof timeout === "number" ? setTimeout(() => {
                    this.pendingCommands[token]?.callbackResolve({
                        success: false,
                        error: "command timed out",
                        timings: { upstream: 0, handle: 0, downstream: 0 }
                    });
                }, timeout) : undefined,
                callbackResolve: result => {
                    clearTimeout(this.pendingCommands[token]?.timeout);
                    delete this.pendingCommands[token];

                    resolve(result);
                },
                timestampSend: Date.now()
            };

            try {
                this.postMessage({
                    command: command,
                    type: "command",

                    payload: data,
                    token: token
                } as WorkerMessageCommand, transfer);
            } catch (error) {
                let message;
                if(typeof error === "string") {
                    message = error;
                } else if(error instanceof Error) {
                    message = error.message;
                } else {
                    console.error("Failed to post a message: %o", error);
                    message = "lookup the console";
                }

                this.pendingCommands[token].callbackResolve({
                    success: false,
                    error: message,
                    timings: {
                        downstream: 0,
                        handle: 0,
                        upstream: 0
                    }
                });
            }
        });
    }

    async executeThrow<T extends keyof CommandsSend>(
        command: T,
        data: CommandsSend[T],
        timeout?: number,
        transfer?: Transferable[]
    ) : Promise<CommandResponseType<CommandsSend, CommandsReceive, CommandMapping, T>> {
        const response = await this.execute(command, data, timeout, transfer);
        if(response.success === false) {
            throw response.error;
        }

        return response.result;
    }


    notify<T extends keyof NotifySend>(notify: T, payload: NotifySend[T], transfer?: Transferable[]) {
        this.postMessage({
            type: "notify",
            notify: notify,
            payload: payload
        } as WorkerMessageNotify, transfer);
    }

    protected handleMessage(message: WorkerMessage<CommandsReceive>) {
        const timestampReceived = Date.now();

        if(message.type === "notify") {
            const notifyHandler = this.notifyHandlers[message.notify];
            if(typeof notifyHandler !== "function") {
                console.warn("Received unknown notify (%s)", message.notify);
                return;
            }

            notifyHandler(message.payload);
            return;
        } else if(message.type === "response") {
            const request = this.pendingCommands[message.token];
            if(typeof request !== "object") {
                console.warn("Received execute result for unknown token (%s)", message.token);
                return;
            }
            delete this.pendingCommands[message.token];
            clearTimeout(request.timeout);

            if(message.status === "success") {
                request.callbackResolve({
                    timings: {
                        downstream: message.timestampReceived - request.timestampSend,
                        handle: message.timestampSend - message.timestampReceived,
                        upstream: Date.now() - message.timestampSend
                    },
                    success: true,
                    result: message.result
                });
            } else {
                request.callbackResolve({
                    timings: {
                        downstream: message.timestampReceived - request.timestampSend,
                        handle: message.timestampSend - message.timestampReceived,
                        upstream: Date.now() - message.timestampSend
                    },
                    success: false,
                    error: message.error
                });
            }
        } else if(message.type === "command") {
            const command = message as WorkerMessageCommand;

            const sendExecuteError = error => {
                let errorMessage;
                if(typeof error === "string") {
                    errorMessage = error;
                } else if(error instanceof Error) {
                    console.error("Message handle error: %o", error);
                    errorMessage = error.message;
                } else {
                    console.error("Message handle error: %o", error);
                    errorMessage = "lookup the console";
                }

                postMessage({
                    type: "response",

                    status: "error",
                    error: errorMessage,

                    timestampReceived: timestampReceived,
                    timestampSend: Date.now(),

                    token: command.token
                } as WorkerMessageCommandResponseError, undefined);
            };

            const sendExecuteResult = (result, transfer) => {
                postMessage({
                    type: "response",

                    status: "success",
                    result: result,

                    timestampReceived: timestampReceived,
                    timestampSend: Date.now(),

                    token: command.token
                } as WorkerMessageCommandResponseSuccess, undefined, transfer);
            };

            const handler = this.messageHandlers[message.command as any];
            if(!handler) {
                sendExecuteError("unknown command");
                return;
            }

            let context = {
                transferObjects: []
            } as MessageContext;

            let response;
            try {
                response = handler(command.payload, context);
            } catch(error) {
                response = Promise.reject(error);
            }

            (response instanceof Promise ? response : Promise.resolve(response)).then(result => {
                sendExecuteResult(result, context.transferObjects);
            }).catch(error => sendExecuteError(error));
            return;
        } else {
            console.warn("Received unknown message of type %s. This should never happen!", (message as any).type);
            return;
        }
    }

    protected abstract postMessage(message: WorkerMessage<CommandsSend>, transfer?: Transferable[]);
}