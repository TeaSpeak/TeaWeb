import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {WebVoicePlayer} from "tc-backend/web/voice/VoicePlayer";

export class VoiceClientController extends WebVoicePlayer implements VoiceClient {
    private readonly clientId: number;

    constructor(clientId) {
        super();
        this.clientId = clientId;
    }

    getClientId(): number {
        return this.clientId;
    }
}