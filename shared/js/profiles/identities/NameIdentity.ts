/// <reference path="../Identity.ts" />

namespace profiles.identities {
    class NameHandshakeHandler extends AbstractHandshakeIdentityHandler {
        readonly identity: NameIdentity;
        handler: HandshakeCommandHandler<NameHandshakeHandler>;

        constructor(connection: connection.AbstractServerConnection, identity: profiles.identities.NameIdentity) {
            super(connection);
            this.identity = identity;

            this.handler = new HandshakeCommandHandler(connection, this);
            this.handler["handshakeidentityproof"] = () => this.trigger_fail("server requested unexpected proof");
        }

        start_handshake() {
            this.connection.command_handler_boss().register_handler(this.handler);
            this.connection.send_command("handshakebegin", {
                intention: 0,
                authentication_method: this.identity.type(),
                client_nickname: this.identity.name()
            }).catch(error => {
                log.error(LogCategory.IDENTITIES, tr("Failed to initialize name based handshake. Error: %o"), error);
                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
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

        spawn_identity_handshake_handler(connection: connection.AbstractServerConnection) : connection.HandshakeIdentityHandler {
            return new NameHandshakeHandler(connection, this);
        }
    }
}