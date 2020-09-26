import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";
import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import * as React from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {ChannelTreeRenderer} from "tc-shared/ui/tree/Renderer";

class ChannelTreeModal extends AbstractModal {
    readonly events: Registry<ChannelTreeUIEvents>;
    readonly handlerId: string;

    constructor(registry: Registry<ChannelTreeUIEvents>, userData: any) {
        super();

        this.handlerId = userData.handlerId;
        this.events = registry;
    }

    renderBody(): React.ReactElement {
        return <ChannelTreeRenderer events={this.events} handlerId={this.handlerId} />;
    }

    title(): string | React.ReactElement<Translatable> {
        return <Translatable>Channel tree</Translatable>;
    }
}

export = ChannelTreeModal;