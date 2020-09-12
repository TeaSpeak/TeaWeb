import {GenericCommandMapping, GenericCommands, GenericNotify} from "./Definitions";
import {WorkerCommunication} from "../workers/Worker";
import {WorkerMessage} from "../workers/Protocol";

export class WorkerHandler<
    CommandsToWorker extends GenericCommands,
    CommandsFromWorker extends GenericCommands,
    CommandMapping extends GenericCommandMapping<CommandsToWorker, CommandsFromWorker>,
    NotifyToWorker extends GenericNotify = never,
    NotifyFromWorker extends GenericNotify = never
> extends WorkerCommunication<CommandsFromWorker, CommandsToWorker, CommandMapping, NotifyFromWorker, NotifyToWorker> {
    constructor() {
        super();
    }

    initialize() {
        addEventListener("message", event => this.handleMessage(event.data));
    }

    protected postMessage(message: WorkerMessage<CommandsFromWorker>, transfer?: Transferable[]) {
        postMessage(message, undefined, transfer);
    }
}