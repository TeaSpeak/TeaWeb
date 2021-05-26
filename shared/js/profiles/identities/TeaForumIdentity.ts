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
import * as forum from "./teaspeak-forum";
import { tr } from "tc-shared/i18n/localize";

class TeaForumHandshakeHandler extends AbstractHandshakeIdentityHandler {
    readonly identity: TeaForumIdentity;
    handler: HandshakeCommandHandler<TeaForumHandshakeHandler>;

    constructor(connection: AbstractServerConnection, identity: TeaForumIdentity) {
        super(connection);
        this.identity = identity;
        this.handler = new HandshakeCommandHandler(connection, this);
        this.handler["handshakeidentityproof"] = this.handle_proof.bind(this);
    }

    executeHandshake() {
        this.connection.getCommandHandler().registerHandler(this.handler);
        this.connection.send_command("handshakebegin", {
            intention: 0,
            authentication_method: this.identity.type(),
            data: this.identity.data().data_json()
        }).catch(error => {
            logError(LogCategory.IDENTITIES, tr("Failed to initialize TeaForum based handshake. Error: %o"), error);

            if(error instanceof CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute begin (" + error + ")");
        });
    }


    private handle_proof(json) {
        this.connection.send_command("handshakeindentityproof", {
            proof: this.identity.data().data_sign()
        }).catch(error => {
            logError(LogCategory.IDENTITIES, tr("Failed to proof the identity. Error: %o"), error);

            if(error instanceof CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute proof (" + error + ")");
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

export class TeaForumIdentity implements Identity {
    private readonly identity_data: forum.Data;

    valid() : boolean {
        return !!this.identity_data && !this.identity_data.is_expired();
    }

    constructor(data: forum.Data) {
        this.identity_data = data;
    }

    data() {
        return this.identity_data;
    }

    decode(data) : Promise<void> {
        data = JSON.parse(data);
        if(data.version !== 1)
            throw "invalid version";

        return;
    }

    encode() : string {
        return JSON.stringify({
            version: 1
        });
    }

    spawn_identity_handshake_handler(connection: AbstractServerConnection) : HandshakeIdentityHandler {
        return new TeaForumHandshakeHandler(connection, this);
    }

    fallback_name(): string | undefined {
        return this.identity_data ? this.identity_data.name() : undefined;
    }

    type(): IdentitifyType {
        return IdentitifyType.TEAFORO;
    }

    uid(): string {
        //FIXME: Real UID!
        return "TeaForo#" + ((this.identity_data ? this.identity_data.name() : "Another TeaSpeak user"));
    }

    public static identity() {
        return static_identity;
    }
}

let static_identity: TeaForumIdentity;

export function set_static_identity(identity: TeaForumIdentity) {
    static_identity = identity;
}

export function update_forum() {
    if(forum.logged_in() && (!static_identity || static_identity.data() !== forum.data())) {
        static_identity = new TeaForumIdentity(forum.data());
    } else {
        static_identity = undefined;
    }
}

export function valid_static_forum_identity() : boolean {
    return static_identity && static_identity.valid();
}

export function static_forum_identity() : TeaForumIdentity | undefined {
    return static_identity;
}