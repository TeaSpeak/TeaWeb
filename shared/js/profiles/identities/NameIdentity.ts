/// <reference path="../Identity.ts" />

namespace profiles.identities {
    class NameHandshakeHandler extends AbstractHandshakeIdentityHandler {
        readonly identity: NameIdentity;

        constructor(connection: ServerConnection, identity: profiles.identities.NameIdentity) {
            super(connection);
            this.identity = identity;
        }

        start_handshake() {
            this.connection.commandHandler["handshakeidentityproof"] = () => this.trigger_fail("server requested unexpected proof");

            this.connection.sendCommand("handshakebegin", {
                intention: 0,
                authentication_method: this.identity.type(),
                client_nickname: this.identity.name()
            }).catch(error => {
                console.error(tr("Failed to initialize name based handshake. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
            }).then(() => this.trigger_success());
        }
    }

    export class NameIdentity implements Identity {
        private _name: string;

        constructor(name?: string) {
            this._name = name;
        }

        set_name(name: string) { this._name = name; }

        name(): string {
            return this._name;
        }

        uid(): string {
            return btoa(this._name); //FIXME hash!
        }

        type(): IdentitifyType {
            return IdentitifyType.NICKNAME;
        }

        valid(): boolean {
            return this._name != undefined && this._name.length >= 3;
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

        spawn_identity_handshake_handler(connection: ServerConnection) : HandshakeIdentityHandler {
            return new NameHandshakeHandler(connection, this);
        }
    }
}