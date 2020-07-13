import "./shared";
import * as loader from "../loader/loader";
import {Stage} from "../loader/loader";

export function run() {
    loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
        name: "doing nothing",
        priority: 1,
        function: async taskId => {
            console.log("Doing nothing");

            for(let index of [1, 2, 3]) {
                await new Promise(resolve => {
                    const callback = () => {
                        document.removeEventListener("click", resolve);
                        resolve();
                    };

                    document.addEventListener("click", callback);
                });
                loader.setCurrentTaskName(taskId, "try again (" + index + ")");
            }
        }
    });

    loader.execute_managed();
}