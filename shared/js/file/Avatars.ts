import {Registry} from "tc-shared/events";
import * as hex from "tc-shared/crypto/hex";

export const kIPCAvatarChannel = "avatars";
export const kDefaultAvatarImage = "img/style/avatar.png";
export type AvatarState = "unset" | "loading" | "errored" | "loaded";

export interface AvatarStateData {
    "unset": {},
    "loading": {},
    "errored": { message: string },
    "loaded": { url: string }
}

interface AvatarEvents {
    avatar_changed: {
        newAvatarHash: string
    },
    avatar_state_changed: {
        oldState: AvatarState,
        newState: AvatarState,
        newStateData: AvatarStateData[keyof AvatarStateData]
    }
}

export abstract class ClientAvatar {
    readonly events: Registry<AvatarEvents>;
    readonly clientAvatarId: string; /* the base64 unique id thing from a-m */

    private currentAvatarHash: string | "unknown"; /* the client avatars flag */
    private state: AvatarState = "loading";

    private stateData: AvatarStateData[AvatarState] = {};

    loadingTimestamp: number = 0;

    constructor(clientAvatarId: string) {
        this.clientAvatarId = clientAvatarId;
        this.events = new Registry<AvatarEvents>();

        this.events.on("avatar_state_changed", event => { this.state = event.newState; this.stateData = event.newStateData; });
        this.events.on("avatar_changed", event => this.currentAvatarHash = event.newAvatarHash);
    }

    destroy() {
        this.setState("unset", {});
        this.events.destroy();
    }

    protected setState<T extends AvatarState>(state: T, data: AvatarStateData[T], force?: boolean) {
        if(this.state === state && !force)
            return;

        this.destroyStateData(this.state, this.stateData);
        this.events.fire("avatar_state_changed", { newState: state, oldState: this.state, newStateData: data });
    }

    public getTypedStateData<T extends AvatarState>(state: T) : AvatarStateData[T] {
        if(this.state !== state)
            throw "invalid avatar state";

        return this.stateData as any;
    }

    public setUnset() {
        this.setState("unset", {});
    }

    public setLoading() {
        this.setState("loading", {});
    }

    public setLoaded(data: AvatarStateData["loaded"]) {
        this.setState("loaded", data);
    }

    public setErrored(data: AvatarStateData["errored"]) {
        this.setState("errored", data);
    }

    async awaitLoaded() {
        if(this.state !== "loading")
            return;

        await new Promise(resolve => this.events.on("avatar_state_changed", event => event.newState !== "loading" && resolve()));
    }

    getState() : AvatarState {
        return this.state;
    }

    getStateData() : AvatarStateData[AvatarState] {
        return this.stateData;
    }

    getAvatarHash() : string | "unknown" {
        return this.currentAvatarHash;
    }

    getAvatarUrl() {
        if(this.state === "loaded")
            return this.getTypedStateData("loaded").url || kDefaultAvatarImage;
        return kDefaultAvatarImage;
    }

    getLoadError() {
        return this.getTypedStateData("errored").message;
    }

    protected abstract destroyStateData(state: AvatarState, data: AvatarStateData[AvatarState]);
}

export abstract class AbstractAvatarManager {
    abstract resolveAvatar(clientAvatarId: string, avatarHash?: string) : ClientAvatar;
    abstract resolveClientAvatar(client: { id?: number, database_id?: number, clientUniqueId: string });
}

export abstract class AbstractAvatarManagerFactory {
    abstract hasManager(handlerId: string) : boolean;
    abstract getManager(handlerId: string) : AbstractAvatarManager;
}

let globalAvatarManagerFactory: AbstractAvatarManagerFactory;
export function setGlobalAvatarManagerFactory(factory: AbstractAvatarManagerFactory) {
    if(globalAvatarManagerFactory)
        throw "global avatar manager factory has already been set";
    globalAvatarManagerFactory = factory;
}

export function getGlobalAvatarManagerFactory() {
    return globalAvatarManagerFactory;
}

export function uniqueId2AvatarId(unique_id: string) {
    function str2ab(str) {
        let buf = new ArrayBuffer(str.length); // 2 bytes for each char
        let bufView = new Uint8Array(buf);
        for (let i=0, strLen = str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    try {
        let raw = atob(unique_id);
        let input = hex.encode(str2ab(raw));

        let result: string = "";
        for(let index = 0; index < input.length; index++) {
            let c = input.charAt(index);
            let offset: number = 0;
            if(c >= '0' && c <= '9')
                offset = c.charCodeAt(0) - '0'.charCodeAt(0);
            else if(c >= 'A' && c <= 'F')
                offset = c.charCodeAt(0) - 'A'.charCodeAt(0) + 0x0A;
            else if(c >= 'a' && c <= 'f')
                offset = c.charCodeAt(0) - 'a'.charCodeAt(0) + 0x0A;
            result += String.fromCharCode('a'.charCodeAt(0) + offset);
        }
        return result;
    } catch (e) { //invalid base 64 (like music bot etc)
        return undefined;
    }
}