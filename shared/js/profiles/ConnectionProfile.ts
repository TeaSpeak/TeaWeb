import {decode_identity, IdentitifyType, Identity} from "../profiles/Identity";
import {guid} from "../crypto/uid";
import {TeaForumIdentity} from "../profiles/identities/TeaForumIdentity";
import {TeaSpeakIdentity} from "../profiles/identities/TeamSpeakIdentity";
import {AbstractServerConnection} from "../connection/ConnectionBase";
import {HandshakeIdentityHandler} from "../connection/HandshakeHandler";
import {createErrorModal} from "../ui/elements/Modal";
import {formatMessage} from "../ui/frames/chat";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {LogCategory, logDebug, logError} from "tc-shared/log";

export class ConnectionProfile {
    id: string;

    profileName: string;
    defaultUsername: string;
    defaultPassword: string;

    selectedIdentityType: string = "unset";
    identities: { [key: string]: Identity } = {};

    constructor(id: string) {
        this.id = id;
    }

    connectUsername(): string {
        if (this.defaultUsername && this.defaultUsername !== "Another TeaSpeak user")
            return this.defaultUsername;

        let selected = this.selectedIdentity();
        let name = selected ? selected.fallback_name() : undefined;
        return name || "Another TeaSpeak user";
    }

    selectedIdentity(current_type?: IdentitifyType): Identity {
        if (!current_type)
            current_type = this.selectedType();

        if (current_type === undefined)
            return undefined;

        if (current_type == IdentitifyType.TEAFORO) {
            return TeaForumIdentity.identity();
        } else if (current_type == IdentitifyType.TEAMSPEAK || current_type == IdentitifyType.NICKNAME) {
            return this.identities[IdentitifyType[current_type].toLowerCase()];
        }

        return undefined;
    }

    selectedType(): IdentitifyType | undefined {
        return this.selectedIdentityType ? IdentitifyType[this.selectedIdentityType.toUpperCase()] : undefined;
    }

    setIdentity(type: IdentitifyType, identity: Identity) {
        this.identities[IdentitifyType[type].toLowerCase()] = identity;
    }

    spawnIdentityHandshakeHandler(connection: AbstractServerConnection): HandshakeIdentityHandler | undefined {
        const identity = this.selectedIdentity();
        if (!identity)
            return undefined;
        return identity.spawn_identity_handshake_handler(connection);
    }

    encode(): string {
        const identity_data = {};
        for (const key in this.identities) {
            if (this.identities[key]) {
                identity_data[key] = this.identities[key].encode();
            }
        }

        return JSON.stringify({
            version: 1,
            username: this.defaultUsername,
            password: this.defaultPassword,
            profile_name: this.profileName,
            identity_type: this.selectedIdentityType,
            identity_data: identity_data,
            id: this.id
        });
    }

    valid(): boolean {
        const identity = this.selectedIdentity();

        return !!identity && identity.valid();
    }
}

async function decodeProfile(payload: string): Promise<ConnectionProfile | string> {
    const data = JSON.parse(payload);
    if (data.version !== 1) {
        return "invalid version";
    }

    const result: ConnectionProfile = new ConnectionProfile(data.id);
    result.defaultUsername = data.username;
    result.defaultPassword = data.password;
    result.profileName = data.profile_name;
    result.selectedIdentityType = (data.identity_type || "").toLowerCase();

    if (data.identity_data) {
        for (const key of Object.keys(data.identity_data)) {
            const type = IdentitifyType[key.toUpperCase() as string];
            const _data = data.identity_data[key];
            if (type == undefined) continue;

            const identity = await decode_identity(type, _data);
            if (identity == undefined) continue;

            result.identities[key.toLowerCase()] = identity;
        }
    }

    return result;
}

interface ProfilesData {
    version: number;
    profiles: string[];
}

let availableProfiles_: ConnectionProfile[] = [];

async function loadConnectProfiles() {
    availableProfiles_ = [];

    const profiles_json = localStorage.getItem("profiles");
    let profiles_data: ProfilesData = (() => {
        try {
            return profiles_json ? JSON.parse(profiles_json) : {version: 0} as any;
        } catch (error) {
            console.error(tr("Invalid profile json! Resetting profiles :( (%o)"), profiles_json);
            createErrorModal(tr("Profile data invalid"), formatMessage(tr("The profile data is invalid.{:br:}This might cause data loss."))).open();
            return { version: 0 };
        }
    })();

    if (profiles_data.version === 0) {
        profiles_data = {
            version: 1,
            profiles: []
        };
    }
    if (profiles_data.version == 1) {
        for (const profile_data of profiles_data.profiles) {
            const profile = await decodeProfile(profile_data);
            if (typeof profile === "string") {
                console.error(tr("Failed to load profile. Reason: %s, Profile data: %s"), profile, profiles_data);
            } else {
                availableProfiles_.push(profile as ConnectionProfile);
            }
        }
    }

    const defaultProfile = findConnectProfile("default");
    if (!defaultProfile) { //Create a default profile and teaforo profile
        {
            const profile = createConnectProfile(tr("Default Profile"), "default");
            profile.defaultPassword = "";
            profile.defaultUsername = "";
            profile.profileName = "Default Profile";

            /* generate default identity */
            try {
                const identity = await TeaSpeakIdentity.generateNew();
                const begin = Date.now();

                const newLevel = await identity.improveLevelJavascript(8, () => Date.now() - begin < 1000);
                /* await identity.improveLevelNative(8, 1, () => doImprove); */
                logDebug(LogCategory.IDENTITIES, tr("Improved the identity level to %d within %s milliseconds"), newLevel, Date.now() - begin);

                profile.setIdentity(IdentitifyType.TEAMSPEAK, identity);
                profile.selectedIdentityType = IdentitifyType[IdentitifyType.TEAMSPEAK];
            } catch (error) {
                logError(LogCategory.GENERAL, tr("Failed to generate the default identity: %o"), error);
                createErrorModal(tr("Failed to generate default identity"), tr("Failed to generate default identity!<br>Please manually generate the identity within your settings => profiles")).open();
            }
        }

        { /* forum identity (works only when connected to the forum) */
            const profile = createConnectProfile(tr("TeaSpeak Forum Profile"), "teaforo");
            profile.defaultPassword = "";
            profile.defaultUsername = "";

            profile.setIdentity(IdentitifyType.TEAFORO, TeaForumIdentity.identity());
            profile.selectedIdentityType = IdentitifyType[IdentitifyType.TEAFORO];
        }

        save();
    }
}

export function createConnectProfile(name: string, id?: string): ConnectionProfile {
    const profile = new ConnectionProfile(id || guid());
    profile.profileName = name;
    profile.defaultUsername = "";
    availableProfiles_.push(profile);
    return profile;
}

let _requires_save = false;

export function save() {
    const profiles: string[] = [];
    for (const profile of availableProfiles_) {
        profiles.push(profile.encode());
    }

    const data = JSON.stringify({
        version: 1,
        profiles: profiles
    });
    localStorage.setItem("profiles", data);
}

export function mark_need_save() {
    _requires_save = true;
}

export function requires_save(): boolean {
    return _requires_save;
}

export function availableConnectProfiles(): ConnectionProfile[] {
    return availableProfiles_;
}

export function findConnectProfile(id: string): ConnectionProfile | undefined {
    for (const profile of availableConnectProfiles()) {
        if (profile.id == id) {
            return profile;
        }
    }

    return undefined;
}

export function find_profile_by_name(name: string): ConnectionProfile | undefined {
    name = name.toLowerCase();
    for (const profile of availableConnectProfiles())
        if ((profile.profileName || "").toLowerCase() == name)
            return profile;

    return undefined;
}


export function defaultConnectProfile(): ConnectionProfile {
    return findConnectProfile("default");
}

export function set_default_profile(profile: ConnectionProfile) {
    const old_default = defaultConnectProfile();
    if (old_default && old_default != profile) {
        old_default.id = guid();
    }
    profile.id = "default";
    return old_default;
}

export function delete_profile(profile: ConnectionProfile) {
    availableProfiles_.remove(profile);
}

window.addEventListener("beforeunload", event => {
    if(requires_save()) {
        save();
    }
});

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "Identity setup",
    function: async () => {
        await loadConnectProfiles();
    },
    priority: 30
})