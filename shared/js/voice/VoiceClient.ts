import {VoicePlayer} from "tc-shared/voice/VoicePlayer";

export interface VoiceClient extends VoicePlayer {
    getClientId() : number;
}