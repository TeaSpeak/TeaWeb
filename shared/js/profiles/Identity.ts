import {AbstractServerConnection, ServerCommand} from "../connection/ConnectionBase";
import {HandshakeIdentityHandler} from "../connection/HandshakeHandler";
import {AbstractCommandHandler} from "../connection/AbstractCommandHandler";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";

export enum IdentitifyType {
    TEAFORO,
    TEAMSPEAK,
    NICKNAME
}

export interface Identity {
    fallback_name(): string | undefined ;
    uid() : string;
    type() : IdentitifyType;

    valid() : boolean;

    encode?() : string;
    decode(data: string) : Promise<void>;

    spawn_identity_handshake_handler(connection: AbstractServerConnection) : HandshakeIdentityHandler;
}

/* avoid circular dependencies here */
export async function decode_identity(type: IdentitifyType, data: string) : Promise<Identity> {
    let identity: Identity;
    switch (type) {
        case IdentitifyType.NICKNAME:
            const nidentity = require("tc-shared/profiles/identities/NameIdentity");
            identity = new nidentity.NameIdentity();
            break;
        case IdentitifyType.TEAFORO:
            const fidentity = require("tc-shared/profiles/identities/TeaForumIdentity");
            identity = new fidentity.TeaForumIdentity(undefined);
            break;
        case IdentitifyType.TEAMSPEAK:
            const tidentity = require("tc-shared/profiles/identities/TeamSpeakIdentity");
            identity = new tidentity.TeaSpeakIdentity(undefined, undefined);
            break;
    }
    if(!identity)
        return undefined;

    try {
        await identity.decode(data)
    } catch(error) {
        logError(LogCategory.IDENTITIES, tr("Failed to decode identity: %o"), error);
        return undefined;
    }

    return identity;
}

export function create_identity(type: IdentitifyType) {
    let identity: Identity;
    switch (type) {
        case IdentitifyType.NICKNAME:
            const nidentity = require("tc-shared/profiles/identities/NameIdentity");
            identity = new nidentity.NameIdentity();
            break;
        case IdentitifyType.TEAFORO:
            const fidentity = require("tc-shared/profiles/identities/TeaForumIdentity");
            identity = new fidentity.TeaForumIdentity(undefined);
            break;
        case IdentitifyType.TEAMSPEAK:
            const tidentity = require("tc-shared/profiles/identities/TeamSpeakIdentity");
            identity = new tidentity.TeaSpeakIdentity(undefined, undefined);
            break;
    }
    return identity;
}

export class HandshakeCommandHandler<T extends AbstractHandshakeIdentityHandler> extends AbstractCommandHandler {
    readonly handle: T;

    constructor(connection: AbstractServerConnection, handle: T) {
        super(connection);
        this.handle = handle;
    }


    handle_command(command: ServerCommand): boolean {
        if(typeof this[command.command] === "function") {
            this[command.command](command.arguments);
        } else if(command.command == "error") {
            return false;
        } else {
            logWarn(LogCategory.IDENTITIES, tr("Received unknown command while handshaking (%o)"), command);
        }
        return true;
    }
}

export abstract class AbstractHandshakeIdentityHandler implements HandshakeIdentityHandler {
    connection: AbstractServerConnection;

    protected callbacks: ((success: boolean, message?: string) => any)[] = [];

    protected constructor(connection: AbstractServerConnection) {
        this.connection = connection;
    }

    registerCallback(callback: (success: boolean, message?: string) => any) {
        this.callbacks.push(callback);
    }

    fillClientInitData(data: any) { }

    abstract executeHandshake();

    protected trigger_success() {
        for(const callback of this.callbacks)
            callback(true);
    }

    protected trigger_fail(message: string) {
        for(const callback of this.callbacks)
            callback(false, message);
    }
}