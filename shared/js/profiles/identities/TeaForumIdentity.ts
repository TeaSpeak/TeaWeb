/// <reference path="../Identity.ts" />

namespace profiles.identities {
    class TeaForumHandshakeHandler extends AbstractHandshakeIdentityHandler {
        readonly identity: TeaForumIdentity;
        handler: HandshakeCommandHandler<TeaForumHandshakeHandler>;

        constructor(connection: connection.AbstractServerConnection, identity: profiles.identities.TeaForumIdentity) {
            super(connection);
            this.identity = identity;
            this.handler = new HandshakeCommandHandler(connection, this);
            this.handler["handshakeidentityproof"] = this.handle_proof.bind(this);
        }

        start_handshake() {
            this.connection.command_handler_boss().register_handler(this.handler);
            this.connection.send_command("handshakebegin", {
                intention: 0,
                authentication_method: this.identity.type(),
                data: this.identity.data().data_json()
            }).catch(error => {
                log.error(LogCategory.IDENTITIES, tr("Failed to initialize TeaForum based handshake. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
            });
        }


        private handle_proof(json) {
            this.connection.send_command("handshakeindentityproof", {
                proof: this.identity.data().data_sign()
            }).catch(error => {
                log.error(LogCategory.IDENTITIES, tr("Failed to proof the identity. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute proof (" + error + ")");
            }).then(() => this.trigger_success());
        }

        protected trigger_fail(message: string) {
            this.connection.command_handler_boss().unregister_handler(this.handler);
            super.trigger_fail(message);
        }

        protected trigger_success() {
            this.connection.command_handler_boss().unregister_handler(this.handler);
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

        data() : forum.Data {
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

        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection) : connection.HandshakeIdentityHandler {
            return new TeaForumHandshakeHandler(connection, this);
        }

        fallback_name(): string | undefined {
            return this.identity_data ? this.identity_data.name() : undefined;
        }

        type(): profiles.identities.IdentitifyType {
            return IdentitifyType.TEAFORO;
        }

        uid(): string {
            //FIXME: Real UID!
            return "TeaForo#" + ((this.identity_data ? this.identity_data.name() : "Another TeaSpeak user"));
        }
    }

    let static_identity: TeaForumIdentity;

    export function set_static_identity(identity: TeaForumIdentity) {
        static_identity = identity;
    }

    export function update_forum() {
        if(forum.logged_in() && (!static_identity || static_identity.data() !== forum.data())) {
            static_identity = new TeaForumIdentity(forum.data());
        }
    }

    export function valid_static_forum_identity() : boolean {
        return static_identity && static_identity.valid();
    }

    export function static_forum_identity() : TeaForumIdentity | undefined {
        return static_identity;
    }
}