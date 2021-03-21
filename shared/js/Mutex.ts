export class Mutex<T> {
    private value: T;
    private taskExecuting = false;
    private taskQueue = [];

    constructor(value: T) {
        this.value = value;
    }

    execute<R>(callback: (value: T, setValue: (newValue: T) => void) => R | Promise<R>) : Promise<R> {
        return new Promise<R>((resolve, reject) => {
            this.taskQueue.push(() => new Promise(taskResolve => {
                try {
                    const result = callback(this.value, newValue => this.value = newValue);
                    if(result instanceof Promise) {
                        result.then(result => {
                            taskResolve();
                            resolve(result);
                        }).catch(error => {
                            taskResolve();
                            reject(error);
                        });
                    } else {
                        taskResolve();
                        resolve(result);
                    }
                } catch (error) {
                    taskResolve();
                    reject(error);
                }
            }));

            if(!this.taskExecuting) {
                this.executeNextTask();
            }
        });
    }

    async tryExecute<R>(callback: (value: T, setValue: (newValue: T) => void) => R | Promise<R>) : Promise<{ status: "success", result: R } | { status: "would-block" }> {
        if(!this.taskExecuting) {
            return {
                status: "success",
                result: await this.execute(callback)
            };
        } else {
            return {
                status: "would-block"
            };
        }
    }

    private executeNextTask() {
        const task = this.taskQueue.pop_front();
        if(typeof task === "undefined") {
            this.taskExecuting = false;
            return;
        }

        this.taskExecuting = true;
        task().then(() => this.executeNextTask());
    }
}