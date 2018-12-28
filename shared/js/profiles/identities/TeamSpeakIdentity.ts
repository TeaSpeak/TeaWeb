/// <reference path="../Identity.ts" />

namespace profiles.identities {
    export namespace TSIdentityHelper {
        export let funcationParseIdentity: any;
        export let funcationParseIdentityByFile: any;
        export let funcationCalculateSecurityLevel: any;
        export let functionUid: any;
        export let funcationExportIdentity: any;
        export let funcationPublicKey: any;
        export let funcationSignMessage: any;

        let functionLastError: any;
        let functionClearLastError: any;

        let functionDestroyString: any;
        let functionDestroyIdentity: any;

        export function setup() : boolean {
            functionDestroyString = Module.cwrap("destroy_string", "pointer", []);
            functionLastError = Module.cwrap("last_error_message", null, ["string"]);
            funcationParseIdentity = Module.cwrap("parse_identity", "pointer", ["string"]);
            funcationParseIdentityByFile = Module.cwrap("parse_identity_file", "pointer", ["string"]);
            functionDestroyIdentity = Module.cwrap("delete_identity", null, ["pointer"]);

            funcationCalculateSecurityLevel = Module.cwrap("identity_security_level", "pointer", ["pointer"]);
            funcationExportIdentity = Module.cwrap("identity_export", "pointer", ["pointer"]);
            funcationPublicKey = Module.cwrap("identity_key_public", "pointer", ["pointer"]);
            funcationSignMessage = Module.cwrap("identity_sign", "pointer", ["pointer", "string", "number"]);
            functionUid = Module.cwrap("identity_uid", "pointer", ["pointer"]);

            return Module.cwrap("tomcrypt_initialize", "number", [])() == 0;
        }

        export function last_error() : string {
            return unwarpString(functionLastError());
        }

        export function unwarpString(str) : string {
            if(str == "") return "";
            try {
                if(!$.isFunction(window.Pointer_stringify)) {
                    displayCriticalError(tr("Missing required wasm function!<br>Please reload the page!"));
                }
                let message: string = window.Pointer_stringify(str);
                functionDestroyString(str);
                return message;
            } catch (error) {
                console.error(error);
                return "";
            }
        }

        export function loadIdentity(key: string) : TeamSpeakIdentity {
            let handle = funcationParseIdentity(key);
            if(!handle) return undefined;
            return new TeamSpeakIdentity(handle, "TeaWeb user");
        }

        export function loadIdentityFromFileContains(contains: string) : TeamSpeakIdentity {
            let handle = funcationParseIdentityByFile(contains);
            if(!handle) return undefined;
            return new TeamSpeakIdentity(handle, "TeaWeb user");
        }

        export function load_identity(handle: TeamSpeakIdentity, key) : boolean {
            let native_handle = funcationParseIdentity(key);
            if(!native_handle) return false;

            handle["handle"] = native_handle;
            return true;
        }
    }

    class TeamSpeakHandshakeHandler extends AbstractHandshakeIdentityHandler {
        identity: TeamSpeakIdentity;

        constructor(connection: ServerConnection, identity: TeamSpeakIdentity) {
            super(connection);
            this.identity = identity;
        }

        start_handshake() {
            this.connection.commandHandler["handshakeidentityproof"] = this.handle_proof.bind(this);

            this.connection.sendCommand("handshakebegin", {
                intention: 0,
                authentication_method: this.identity.type(),
                publicKey: this.identity.publicKey()
            }).catch(error => {
                console.error(tr("Failed to initialize TeamSpeak based handshake. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute begin (" + error + ")");
            });
        }

        private handle_proof(json) {
            const proof = this.identity.signMessage(json[0]["message"]);

            this.connection.sendCommand("handshakeindentityproof", {proof: proof}).catch(error => {
                console.error(tr("Failed to proof the identity. Error: %o"), error);

                if(error instanceof CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute proof (" + error + ")");
            }).then(() => this.trigger_success());
        }
    }

    export class TeamSpeakIdentity implements Identity {
        private handle: any;
        private _name: string;

        constructor(handle: any, name: string) {
            this.handle = handle;
            this._name = name;
        }

        securityLevel() : number | undefined {
            return parseInt(TSIdentityHelper.unwarpString(TSIdentityHelper.funcationCalculateSecurityLevel(this.handle)));
        }

        name() : string { return this._name; }

        uid() : string {
            return TSIdentityHelper.unwarpString(TSIdentityHelper.functionUid(this.handle));
        }

        type() : IdentitifyType { return IdentitifyType.TEAMSPEAK; }

        signMessage(message: string): string {
            return TSIdentityHelper.unwarpString(TSIdentityHelper.funcationSignMessage(this.handle, message, message.length));
        }

        exported() : string {
            return TSIdentityHelper.unwarpString(TSIdentityHelper.funcationExportIdentity(this.handle));
        }

        publicKey() : string {
            return TSIdentityHelper.unwarpString(TSIdentityHelper.funcationPublicKey(this.handle));
        }

        valid() : boolean { return this.handle !== undefined; }

        decode(data) : boolean {
            data = JSON.parse(data);
            if(data.version != 1) return false;

            if(!TSIdentityHelper.load_identity(this, data["key"]))
                return false;
            this._name = data["name"];
            return true;
        }

        encode?() : string {
            if(!this.handle) return undefined;

            const key = this.exported();
            if(!key) return undefined;

            return JSON.stringify({
                key: key,
                name: this._name,
                version: 1
            })
        }


        spawn_identity_handshake_handler(connection: ServerConnection) : HandshakeIdentityHandler {
            return new TeamSpeakHandshakeHandler(connection, this);
        }
    }

    export function setup_teamspeak() : boolean {
        return TSIdentityHelper.setup();
    }
}