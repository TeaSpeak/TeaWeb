import {setBackend} from "tc-shared/backend";
import {WebClientBackend} from "tc-shared/backend/WebClient";

setBackend(new class implements WebClientBackend {});