export type MessageTimings = {
    upstream: number;
    downstream: number;
    handle: number;
};

export type ExecuteResultSuccess<T> = {
    timings: MessageTimings,
    success: true,
    result: T
}

export type ExecuteResultError = {
    timings: MessageTimings,
    success: false,
    error: string
}

export type ExecuteResult<Result = any> = ExecuteResultError | ExecuteResultSuccess<Result>;


export type GenericCommands = {[key: string]: any};
export type GenericCommandMapping<CommandsToWorker extends GenericCommands, CommandsFromWorker extends GenericCommands> = {
    [Key in keyof CommandsToWorker | keyof CommandsFromWorker]: any
}

export type CommandResponseType<
    SendCommands extends GenericCommands,
    ReceiveCommands extends GenericCommands,
    Mapping extends GenericCommandMapping<SendCommands, ReceiveCommands>,
    Command extends keyof SendCommands> =

    Mapping[Command] extends string ? ReceiveCommands[Mapping[Command]] : Mapping[Command];

export type GenericNotify = {[key: string]: any};