enum IdentitifyType {
    TEAFORO,
    TEAMSPEAK,
    NICKNAME
}

namespace TSIdentityHelper {
    import Pointer_stringify = Module.Pointer_stringify;
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

    export function  setup() : boolean {
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
            let message: string = Pointer_stringify(str);
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
}

interface Identity {
    name() : string;
    uid() : string;
    type() : IdentitifyType;

    valid() : boolean;
}

class NameIdentity implements Identity {
    private _name: string;

    constructor(name: string) {
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
        return this._name != undefined && this._name != "";
    }

}

class TeamSpeakIdentity implements Identity {
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

    valid() : boolean { return true; }
}

class TeaForumIdentity implements Identity {
    readonly identityData: string;
    readonly identityDataJson: string;
    readonly identitySign: string;

    valid() : boolean {
        return this.identityData.length > 0 && this.identityDataJson.length > 0 && this.identitySign.length > 0;
    }

    constructor(data: string, sign: string) {
        this.identityDataJson = data;
        this.identityData = JSON.parse(this.identityDataJson);
        this.identitySign = sign;
    }

    name() : string { return this.identityData["user_name"]; }
    uid() : string { return "TeaForo#" + this.identityData["user_id"]; }
    type() : IdentitifyType { return IdentitifyType.TEAFORO; }
}