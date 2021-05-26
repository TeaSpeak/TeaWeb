/* TODO: If channel is temporary: delete delay! */
import {ServerAudioEncryptionMode} from "tc-shared/tree/ServerDefinitions";
import {ChannelDescriptionResult} from "tc-shared/tree/ChannelDefinitions";

export interface ModalChannelInfoVariables {
    readonly name: string,
    readonly type: "default" | "permanent" | "semi-permanent" | "temporary" | "unknown";
    readonly chatMode: { mode: "private" | "none" } | { mode: "public", history: number | 0 | -1 }
    readonly currentClients: { status: "subscribed", online: number, limit: number | "unlimited" | "inherited" } | { status: "unsubscribed" },
    readonly audioCodec: { codec: number, quality: number },
    readonly audioEncrypted: { channel: boolean, server: ServerAudioEncryptionMode },
    readonly password: boolean,
    readonly topic: string,
    readonly description: ChannelDescriptionResult,
}

export interface ModalChannelInfoEvents {
    action_reload_description: {}
}
