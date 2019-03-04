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
                data: this.identity.data_json()
            }).catch(error => {
                console.error(tr("Failed to initialize TeaForum based handshake. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
            });
        }


        private handle_proof(json) {
            this.connection.send_command("handshakeindentityproof", {
                proof: this.identity.data_sign()
            }).catch(error => {
                console.error(tr("Failed to proof the identity. Error: %o"), error);

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
        private identity_data: string;
        private identity_data_raw: string;
        private identity_data_sign: string;

        valid() : boolean {
            return this.identity_data_raw.length > 0 && this.identity_data_raw.length > 0 && this.identity_data_sign.length > 0;
        }

        constructor(data: string, sign: string) {
            this.identity_data_raw = data;
            this.identity_data_sign = sign;
            try {
                this.identity_data = data ? JSON.parse(this.identity_data_raw) : undefined;
            } catch(error) { }
        }

        data_json() : string { return this.identity_data_raw; }
        data_sign() : string { return this.identity_data_sign; }

        name() : string { return this.identity_data["user_name"]; }
        uid() : string { return "TeaForo#" + this.identity_data["user_id"]; }
        type() : IdentitifyType { return IdentitifyType.TEAFORO; }

        forum_user_id() { return this.identity_data["user_id"]; }
        forum_user_group() { return this.identity_data["user_group_id"]; }
        is_stuff() : boolean { return this.identity_data["is_staff"]; }
        is_premium() : boolean { return (<number[]>this.identity_data["user_groups"]).indexOf(5) != -1; }
        data_age() : Date { return new Date(this.identity_data["data_age"]); }

        /*
            $user_data["user_id"] = $user->user_id;
            $user_data["user_name"] = $user->username;
            $user_data["user_group"] = $user->user_group_id;
            $user_data["user_groups"] = $user->secondary_group_ids;

            $user_data["trophy_points"] = $user->trophy_points;
            $user_data["register_date"] = $user->register_date;
            $user_data["is_staff"] = $user->is_staff;
            $user_data["is_admin"] = $user->is_admin;
            $user_data["is_super_admin"] = $user->is_super_admin;
            $user_data["is_banned"] = $user->is_banned;

            $user_data["data_age"] = milliseconds();
         */

        decode(data) : Promise<void> {
            data = JSON.parse(data);
            if(data.version !== 1)
                throw "invalid version";

            this.identity_data_raw = data["identity_data"];
            this.identity_data_sign = data["identity_sign"];
            this.identity_data = JSON.parse(this.identity_data);
            return;
        }

        encode?() : string {
            return JSON.stringify({
                version: 1,
                identity_data: this.identity_data_raw,
                identity_sign: this.identity_data_sign
            });
        }

        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection) : connection.HandshakeIdentityHandler {
            return new TeaForumHandshakeHandler(connection, this);
        }
    }

    let static_identity: TeaForumIdentity;

    export function set_static_identity(identity: TeaForumIdentity) {
        static_identity = identity;
    }

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