import * as ipc from "../ipc/BrowserIPC";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";

import {
    AbstractAvatarManager,
    AbstractAvatarManagerFactory, AvatarState, AvatarStateData, ClientAvatar,
    kIPCAvatarChannel,
    setGlobalAvatarManagerFactory, uniqueId2AvatarId
} from "../file/Avatars";
import {getIpcInstance, IPCChannel} from "../ipc/BrowserIPC";
import {AppParameters} from "../settings";
import {ChannelMessage} from "../ipc/BrowserIPC";
import {guid} from "../crypto/uid";
import { tr } from "tc-shared/i18n/localize";

function isEquivalent(a, b) {
    // Create arrays of property names
    const aProps = Object.getOwnPropertyNames(a);
    const bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
        return false;
    }

    for (let i = 0; i < aProps.length; i++) {
        const propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName]) {
            return false;
        }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
}

class RemoteAvatar extends ClientAvatar {
    readonly avatarId: string;
    readonly type: "avatar" | "client-avatar";

    constructor(clientAvatarId: string, type: "avatar" | "client-avatar") {
        super(clientAvatarId);

        this.avatarId = guid();
        this.type = type;
    }

    protected destroyStateData(state: AvatarState, data: AvatarStateData[AvatarState]) {}

    public updateStateFromRemote(state: AvatarState, data: AvatarStateData[AvatarState]) {
        if(this.getState() === state && isEquivalent(this.getStateData(), data))
            return;

        this.setState(state, data, true);
    }
}

class RemoteAvatarManager extends AbstractAvatarManager {
    readonly handlerId: string;
    readonly ipcChannel: IPCChannel;
    private knownAvatars: RemoteAvatar[] = [];

    constructor(handlerId: string, ipcChannel: IPCChannel) {
        super();

        this.ipcChannel = ipcChannel;
        this.handlerId = handlerId;
    }

    destroy() {
        this.knownAvatars.forEach(e => e.destroy());
    }

    resolveAvatar(clientAvatarId: string, avatarHash?: string): ClientAvatar {
        const sendRequest = (avatar: RemoteAvatar) => this.ipcChannel.sendMessage("load-avatar", {
            avatarId: avatar.avatarId,
            handlerId: this.handlerId,

            keyType: "avatar",
            clientAvatarId: avatar.clientAvatarId,
            avatarVersion: avatarHash
        });

        const cachedAvatar = this.knownAvatars.find(e => e.type === "avatar" && e.avatarId === clientAvatarId);
        if(cachedAvatar) {
            if(cachedAvatar.getAvatarHash() !== avatarHash)
                sendRequest(cachedAvatar); /* update */
            return cachedAvatar;
        }

        let avatar = new RemoteAvatar(clientAvatarId, "avatar");
        avatar.setLoading();
        this.knownAvatars.push(avatar);
        sendRequest(avatar);
        return avatar;
    }

    resolveClientAvatar(client: { id?: number; database_id?: number; clientUniqueId: string }) {
        const sendRequest = (avatar: RemoteAvatar) => this.ipcChannel.sendMessage("load-avatar", {
            avatarId: avatar.avatarId,
            handlerId: this.handlerId,

            keyType: "client",
            clientId: client.id,
            clientUniqueId: client.clientUniqueId,
            clientDatabaseId: client.database_id
        });

        const clientAvatarId = uniqueId2AvatarId(client.clientUniqueId);
        const cachedAvatar = this.knownAvatars.find(e => e.type === "client-avatar" && e.clientAvatarId === clientAvatarId);
        if(cachedAvatar) {
            //sendRequest(cachedAvatar); /* just update in case */
            return cachedAvatar;
        }

        let avatar = new RemoteAvatar(clientAvatarId, "client-avatar");
        avatar.setLoading();
        this.knownAvatars.push(avatar);
        sendRequest(avatar);

        return avatar;
    }

    handleAvatarLoadCallback(data: any) {
        const avatar = this.knownAvatars.find(e => e.avatarId === data.avatarId);
        if(!avatar) return;

        if(!(data.success === true)) {
            avatar.setErrored({ message: data.message });
            return;
        }

        if(avatar.getAvatarHash() !== data.hash)
            avatar.events.fire("avatar_changed", { newAvatarHash: data.hash });

        avatar.updateStateFromRemote(data.state, data.stateData);
    }

    handleAvatarEvent(type: string, payload: any) {
        const avatar = this.knownAvatars.find(e => e.avatarId === payload.avatarId);
        if(!avatar) return;

        avatar.events.fire(type as any, payload, true);
    }
}

class RemoteAvatarManagerFactory extends AbstractAvatarManagerFactory {
    private readonly ipcChannel: IPCChannel;
    private manager: {[key: string]: RemoteAvatarManager} = {};

    private callbackHandlerQueried: () => void;

    constructor() {
        super();

        this.ipcChannel = ipc.getIpcInstance().createCoreControlChannel(kIPCAvatarChannel);
        this.ipcChannel.messageHandler = this.handleIpcMessage.bind(this);
    }

    async initialize() {
        this.ipcChannel.sendMessage("query-handlers", {});

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.callbackHandlerQueried = undefined;
                reject(tr("handler query timeout"));
            }, 5000);

            this.callbackHandlerQueried = () => {
                clearTimeout(timeout);
                resolve();
            }
        });
    }

    getManager(handlerId: string): AbstractAvatarManager {
        return this.manager[handlerId];
    }

    hasManager(handlerId: string): boolean {
        return typeof this.manager[handlerId] !== "undefined";
    }

    private handleIpcMessage(_remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast) {
            if(message.type === "notify-handler-destroyed") {
                const manager = this.manager[message.data.handler];
                delete this.manager[message.data.handler];
                manager?.destroy();
            } else if(message.type === "notify-handler-created") {
                this.manager[message.data.handler] = new RemoteAvatarManager(message.data.handler, this.ipcChannel);
            }
        } else {
            if(message.type === "notify-handlers") {
                Object.values(this.manager).forEach(e => e.destroy());
                this.manager = {};

                for(const handlerId of message.data.handlers)
                    this.manager[handlerId] = new RemoteAvatarManager(handlerId, this.ipcChannel);

                if(this.callbackHandlerQueried)
                    this.callbackHandlerQueried();
            } else if(message.type === "load-avatar-result") {
                const manager = this.manager[message.data.handlerId];
                manager?.handleAvatarLoadCallback(message.data);
            } else if(message.type === "avatar-event") {
                const manager = this.manager[message.data.handlerId];
                manager?.handleAvatarEvent(message.data.type, message.data.payload);
            }
        }
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 10,
    name: "IPC avatar init",
    function: async () => {
        let factory = new RemoteAvatarManagerFactory();
        await factory.initialize();
        setGlobalAvatarManagerFactory(factory);
    }
});