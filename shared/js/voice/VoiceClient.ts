import {VoicePlayer} from "../voice/VoicePlayer";

export interface VoiceClient extends VoicePlayer {
    getClientId() : number;
}