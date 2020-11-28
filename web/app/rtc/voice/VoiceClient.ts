import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {RtpVoicePlayer} from "./RtpVoicePlayer";

export class RtpVoiceClient extends RtpVoicePlayer implements VoiceClient {
    private readonly clientId: number;

    constructor(clientId: number) {
        super();

        this.clientId = clientId;
    }

    getClientId(): number {
        return this.clientId;
    }
}