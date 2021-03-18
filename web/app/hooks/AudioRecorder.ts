import {setRecorderBackend} from "tc-shared/audio/Recorder";
import {WebAudioRecorder} from "../audio/Recorder";

setRecorderBackend(new WebAudioRecorder());