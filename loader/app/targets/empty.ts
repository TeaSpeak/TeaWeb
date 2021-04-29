import "./shared";
import * as loader from "../loader/loader";
import {ApplicationLoader, Stage} from "../loader/loader";

export default class implements ApplicationLoader {
    execute() {
        loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
            name: "doing nothing",
            priority: 1,
            function: async taskId => {
                console.log("Doing nothing");

                for(let index of [1, 2, 3]) {
                    await new Promise<void>(resolve => {
                        const callback = () => {
                            document.removeEventListener("click", callback);
                            resolve();
                        };

                        document.addEventListener("click", callback);
                    });
                    loader.setCurrentTaskName(taskId, "try again (" + index + ")");
                }
            }
        });

        loader.execute_managed(false);
    }
}