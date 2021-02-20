import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {AbstractConversationUiEvents} from "./AbstractConversationDefinitions";
import {ConversationPanel} from "./AbstractConversationRenderer";
import * as React from "react";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";

class PopoutConversationRenderer extends AbstractModal {
    private readonly events: Registry<AbstractConversationUiEvents>;
    private readonly userData: any;

    constructor(events: IpcRegistryDescription<AbstractConversationUiEvents>, userData: any) {
        super();

        this.userData = userData;
        this.events = Registry.fromIpcDescription(events);
    }

    renderBody() {
        return <ConversationPanel
            handlerId={this.userData.handlerId}
            events={this.events}
            messagesDeletable={this.userData.messagesDeletable}
            noFirstMessageOverlay={this.userData.noFirstMessageOverlay} />;
    }

    renderTitle() {
        return "Conversations";
    }
}

export = PopoutConversationRenderer;