import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setSoundBackend} from "tc-shared/audio/Sounds";
import {WebSoundBackend} from "../audio/Sounds";

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "audio sound init",
    function: async () => setSoundBackend(new WebSoundBackend()),
    priority: 100
});