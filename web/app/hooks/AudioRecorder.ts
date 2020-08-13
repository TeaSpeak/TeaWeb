import {setRecorderBackend} from "tc-shared/audio/recorder";
import {WebAudioRecorder} from "../audio/Recorder";

setRecorderBackend(new WebAudioRecorder());