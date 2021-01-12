/* Basic message declarations */
export type Message =
    | { type: "Command"; token: string; command: MessageCommand }
    | {     type: "CommandResult"; token: string | null; result:     MessageCommandResult }
    | { type: "Notify"; notify: MessageNotify };

export type MessageCommand =
    | { type: "SessionInitialize"; payload: CommandSessionInitialize }
    | { type: "SessionInitializeAgent"; payload: CommandSessionInitializeAgent }
    | { type: "SessionUpdateLocale"; payload: CommandSessionUpdateLocale };

export type MessageCommandResult =
    | { type: "Success" }
    | { type: "GenericError"; error: string }
    | { type: "ConnectionTimeout" }
    | { type: "ConnectionClosed" }
    | { type: "ClientSessionUninitialized" }
    | { type: "ServerInternalError" }
    | { type: "ParameterInvalid"; parameter: string }
    | { type: "CommandParseError"; error: string }
    | { type: "CommandEnqueueError" }
    | { type: "CommandNotFound" }
    | { type: "SessionAlreadyInitialized" }
    | { type: "SessionAgentAlreadyInitialized" }
    | { type: "SessionNotInitialized" };

export type MessageNotify =
    | { type: "NotifyClientsOnline"; payload: NotifyClientsOnline };

/* All commands */
export type CommandSessionInitialize = { anonymize_ip: boolean };

export type CommandSessionInitializeAgent = {     session_type: number; platform: string | null; platform_version:     string | null; architecture: string | null; client_version: string |     null; ui_version: string | null };

export type CommandSessionUpdateLocale = {     ip_country: string | null; selected_locale: string | null;     local_timestamp: number };

/* Notifies */
export type NotifyClientsOnline = {     users_online: { [key: number]: number }; unique_users_online:     { [key: number]: number }; total_users_online: number;     total_unique_users_online: number };