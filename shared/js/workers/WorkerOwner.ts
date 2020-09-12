import {LogCategory, logDebug} from "../log";
import {WorkerMessage} from "./Protocol";
import {GenericCommandMapping, GenericCommands, GenericNotify} from "./Definitions";
import {tr} from "../i18n/localize";
import {Registry} from "../events";
import {WorkerCommunication} from "tc-shared/workers/Worker";

export interface WorkerEvents {
    notify_worker_died: {}
}

export type WorkerFactory = () => Worker;
export class WorkerOwner<
    CommandsToWorker extends GenericCommands,
    CommandsFromWorker extends GenericCommands,
    CommandMapping extends GenericCommandMapping<CommandsToWorker, CommandsFromWorker>,
    NotifyToWorker extends GenericNotify = never,
    NotifyFromWorker extends GenericNotify = never
> extends WorkerCommunication<CommandsToWorker, CommandsFromWorker, CommandMapping, NotifyToWorker, NotifyFromWorker> {
    readonly events: Registry<WorkerEvents>;
    private readonly factory: WorkerFactory;
    private worker: Worker;

    constructor(factory: WorkerFactory) {
        super();
        this.events = new Registry<WorkerEvents>();
        this.factory = factory;
    }

    isAlive() : boolean {
        return !!this.worker;
    }

    async spawnWorker() {
        this.worker = this.factory();
        this.worker.onmessage = event => this.handleWorkerMessage(event.data);
        this.worker.onerror = () => this.handleWorkerError();
    }

    private handleWorkerMessage(message: WorkerMessage<any>) {
        super.handleMessage(message);
    }

    private handleWorkerError() {
        logDebug(LogCategory.GENERAL, tr("A worker died. Closing worker."));
        this.worker = undefined;

        for(const token of Object.keys(this.pendingCommands)) {
            this.pendingCommands[token].callbackResolve({
                success: false,
                error: tr("worker terminated with an error"),
                timings: { downstream: 0, handle: 0, upstream: 0}
            });
            delete this.pendingCommands[token];
        }
        this.events.fire("notify_worker_died");
    }

    protected postMessage(message: WorkerMessage<CommandsToWorker>, transfer?: Transferable[]) {
        if(!this.worker) {
            throw tr("worker is not alive");
        }

        this.worker.postMessage(message, transfer);
    }
}