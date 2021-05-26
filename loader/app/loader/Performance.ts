export type ResourceRequestResult = {
    status: "success"
} | {
    status: "unknown-error",
    message: string
} | {
    status: "error-event"
} | {
    status: "timeout",
    givenTimeout: number
};

export type ResourceType = "script" | "css" | "json";

export class ResourceRequest {
    private readonly type: ResourceType;
    private readonly name: string;

    private status: "unset" | "pending" | "executing" | "executed";
    private result: ResourceRequestResult | undefined;

    private timestampEnqueue: number;
    private timestampExecuting: number;
    private timestampExecuted: number;

    constructor(type: ResourceType, name: string) {
        this.type = type;
        this.name = name;

        this.status = "unset";
    }

    markEnqueue() {
        if(this.status !== "unset") {
            console.warn("ResourceRequest %s status isn't unset.", this.name);
            return;
        }

        this.timestampEnqueue = performance.now();
        this.status = "pending";
    }

    markExecuting() {
        switch (this.status) {
            case "unset":
                /* the markEnqueue() invoke has been skipped */
                break;

            case "pending":
                break;

            default:
                console.warn("ResourceRequest %s has invalid status to call markExecuting.", this.name);
                return;
        }

        this.timestampExecuting = performance.now();
        this.status = "executing";
    }

    markExecuted(result: ResourceRequestResult) {
        switch (this.status) {
            case "unset":
                /* the markEnqueue() invoke has been skipped */
                break;

            case "pending":
                /* the markExecuting() invoke has been skipped */
                break;

            case "executing":
                break;

            default:
                console.warn("ResourceRequest %s has invalid status to call markExecuted.", this.name);
                return;
        }

        this.result = result;
        this.timestampExecuted = performance.now();
        this.status = "executed";
    }

    generateReportString() {
        let timeEnqueued, timeExecuted;
        if(this.timestampEnqueue === 0) {
            timeEnqueued = "unknown";
        } else {
            let endTimestamp = Math.min(this.timestampExecuting, this.timestampExecuted);
            if (endTimestamp === 0) {
                timeEnqueued = "pending";
            } else {
                timeEnqueued = endTimestamp - this.timestampEnqueue;
            }
        }

        if(this.timestampExecuted === 0) {
            timeExecuted = "unknown";
        } else {
            if( this.timestampExecuted === 0) {
                timeExecuted = "pending";
            } else {
                timeExecuted =  this.timestampExecuted - this.timestampEnqueue;
            }
        }

        return `ResourceRequest{ type: ${this.type}, time enqueued: ${timeEnqueued}, time executed: ${timeExecuted}, name: ${this.name} }`;
    }
}

export class LoaderPerformanceLogger {
    private readonly resourceTimings: ResourceRequest[] = [];
    private eventTimeBase: number;

    constructor() {
        this.eventTimeBase = performance.now();
    }

    getResourceTimings() : ResourceRequest[] {
        return this.resourceTimings;
    }

    logResourceRequest(type: ResourceType, name: string) : ResourceRequest {
        const request = new ResourceRequest(type, name);
        this.resourceTimings.push(request);
        return request;
    }
}