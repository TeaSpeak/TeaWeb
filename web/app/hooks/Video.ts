import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setVideoDriver} from "tc-shared/video/VideoSource";
import {WebVideoDriver} from "tc-backend/web/media/Video";

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 10,
    function: async () => {
        const instance = new WebVideoDriver();
        await instance.initialize();
        setVideoDriver(instance);
    },
    name: "Video init"
});