import {AbstractInput} from "tc-shared/voice/RecorderBase";

export type VoiceBridgeConnectResult = {
    type: "success"
} | {
    type: "canceled"
} | {
    type: "failed",
    message: string,
    allowReconnect: boolean
};

export interface VoicePacket {
    voiceId: number;
    clientId: number;
    codec: number;
    payload: Uint8Array;
}

export interface VoiceWhisperPacket extends VoicePacket {
    clientUniqueId?: string;
    clientNickname?: string;
}

export abstract class VoiceBridge {
    protected muted: boolean;

    callback_send_control_data: (request: string, payload: any) => void;
    callback_incoming_voice: (packet: VoicePacket) => void;
    callback_incoming_whisper: (packet: VoiceWhisperPacket) => void;

    callback_disconnect: () => void;

    setMuted(flag: boolean) {
        this.muted = flag;
    }

    isMuted(): boolean {
        return this.muted;
    }

    handleControlData(request: string, payload: any) { }

    abstract connect(): Promise<VoiceBridgeConnectResult>;
    abstract disconnect();

    abstract getInput(): AbstractInput | undefined;
    abstract setInput(input: AbstractInput | undefined): Promise<void>;

    abstract sendStopSignal(codec: number);
}