/// <reference path="../Identity.ts" />

namespace profiles.identities {
    class TeaForumHandshakeHandler extends AbstractHandshakeIdentityHandler {
        readonly identity: TeaForumIdentity;

        constructor(connection: ServerConnection, identity: profiles.identities.TeaForumIdentity) {
            super(connection);
            this.identity = identity;
        }

        start_handshake() {
            this.connection.commandHandler["handshakeidentityproof"] = this.handle_proof.bind(this);

            this.connection.sendCommand("handshakebegin", {
                intention: 0,
                authentication_method: this.identity.type(),
                data: this.identity.data_json()
            }).catch(error => {
                console.error(tr("Failed to initialize TeaForum based handshake. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
            });
        }


        private handle_proof(json) {
            this.connection.sendCommand("handshakeindentityproof", {
                proof: this.identity.data_sign()
            }).catch(error => {
                console.error(tr("Failed to proof the identity. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute proof (" + error + ")");
            }).then(() => this.trigger_success());
        }
    }

    export class TeaForumIdentity implements Identity {
        private identityData: string;
        private identityDataJson: string;
        private identitySign: string;

        valid() : boolean {
            return this.identityDataJson.length > 0 && this.identityDataJson.length > 0 && this.identitySign.length > 0;
        }

        constructor(data: string, sign: string) {
            this.identityDataJson = data;
            this.identityData = data ? JSON.parse(this.identityDataJson) : undefined;
            this.identitySign = sign;
        }

        data_json() : string { return this.identityDataJson; }
        data_sign() : string { return this.identitySign; }

        name() : string { return this.identityData["user_name"]; }
        uid() : string { return "TeaForo#" + this.identityData["user_id"]; }
        type() : IdentitifyType { return IdentitifyType.TEAFORO; }

        decode(data) {
            data = JSON.parse(data);
            if(data.version !== 1)
                return false;

            this.identityDataJson = data["identity_data"];
            this.identitySign = data["identity_sign"];
            this.identityData = JSON.parse(this.identityData);
            return true;
        }

        encode?() : string {
            return JSON.stringify({
                version: 1,
                identity_data: this.identityDataJson,
                identity_sign: this.identitySign
            });
        }

        spawn_identity_handshake_handler(connection: ServerConnection) : HandshakeIdentityHandler {
            return new TeaForumHandshakeHandler(connection, this);
        }
    }

    let static_identity: TeaForumIdentity;

    export function setup_forum() {
        const user_data = settings.static("forum_user_data") as string;
        const user_sign = settings.static("forum_user_sign") as string;

        if(user_data && user_sign)
            static_identity = new TeaForumIdentity(user_data, user_sign);
    }

    export function valid_static_forum_identity() : boolean {
        return static_identity && static_identity.valid();
    }

    export function static_forum_identity() : TeaForumIdentity | undefined {
        return static_identity;
    }
}