import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {VoicePlayer} from "./VoicePlayer";
import {LogCategory, logTrace} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {RemoteRTPAudioTrack} from "tc-shared/connection/rtc/RemoteTrack";

export class RtpVoiceClient extends VoicePlayer implements VoiceClient {
    private readonly clientId: number;

    constructor(clientId: number) {
        super();

        this.clientId = clientId;
    }

    getClientId(): number {
        return this.clientId;
    }
}