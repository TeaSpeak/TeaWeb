import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {VoicePlayer} from "./VoicePlayer";

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