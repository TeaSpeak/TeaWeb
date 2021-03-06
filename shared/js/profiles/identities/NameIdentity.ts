import {
    AbstractHandshakeIdentityHandler,
    HandshakeCommandHandler,
    IdentitifyType,
    Identity
} from "../../profiles/Identity";
import {LogCategory, logError} from "../../log";
import {CommandResult} from "../../connection/ServerConnectionDeclaration";
import {AbstractServerConnection} from "../../connection/ConnectionBase";
import {HandshakeIdentityHandler} from "../../connection/HandshakeHandler";
import { tr } from "tc-shared/i18n/localize";

class NameHandshakeHandler extends AbstractHandshakeIdentityHandler {
    readonly identity: NameIdentity;
    handler: HandshakeCommandHandler<NameHandshakeHandler>;

    constructor(connection: AbstractServerConnection, identity: NameIdentity) {
        super(connection);
        this.identity = identity;

        this.handler = new HandshakeCommandHandler(connection, this);
        this.handler["handshakeidentityproof"] = () => this.trigger_fail("server requested unexpected proof");
    }

    executeHandshake() {
        this.connection.getCommandHandler().registerHandler(this.handler);
        this.connection.send_command("handshakebegin", {
            intention: 0,
            authentication_method: this.identity.type(),
            client_nickname: this.identity.name()
        }).catch(error => {
            logError(LogCategory.IDENTITIES, tr("Failed to initialize name based handshake. Error: %o"), error);
            if(error instanceof CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute begin (" + error + ")");
        }).then(() => this.trigger_success());
    }

    protected trigger_fail(message: string) {
        this.connection.getCommandHandler().unregisterHandler(this.handler);
        super.trigger_fail(message);
    }

    protected trigger_success() {
        this.connection.getCommandHandler().unregisterHandler(this.handler);
        super.trigger_success();
    }
}

export class NameIdentity implements Identity {
    private _name: string;

    constructor(name?: string) {
        this._name = name;
    }

    set_name(name: string) { this._name = name; }

    name() : string { return this._name; }

    fallback_name(): string | undefined {
        return this._name;
    }

    uid(): string {
        return btoa(this._name); //FIXME hash!
    }

    type(): IdentitifyType {
        return IdentitifyType.NICKNAME;
    }

    valid(): boolean {
        return this._name != undefined && this._name.length >= 5;
    }

    decode(data) : Promise<void> {
        data = JSON.parse(data);
        if(data.version !== 1)
            throw "invalid version";

        this._name = data["name"];
        return;
    }

    encode?() : string {
        return JSON.stringify({
            version: 1,
            name: this._name
        });
    }

    spawn_identity_handshake_handler(connection: AbstractServerConnection) : HandshakeIdentityHandler {
        return new NameHandshakeHandler(connection, this);
    }
}