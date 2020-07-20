import {Registry} from "tc-shared/events";
import {ExternalModalController} from "tc-shared/ui/react-elements/external-modal/Controller";


export function spawnExternalModal<EventClass>(modal: string, events: Registry<EventClass>, userData: any) : ExternalModalController {
    return new ExternalModalController(modal, events as any, userData);
}