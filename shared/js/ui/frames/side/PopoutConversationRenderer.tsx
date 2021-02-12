import {Registry, RegistryMap} from "tc-shared/events";
import {AbstractConversationUiEvents} from "./AbstractConversationDefinitions";
import {ConversationPanel} from "./AbstractConversationRenderer";
import * as React from "react";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";

class PopoutConversationRenderer extends AbstractModal {
    private readonly events: Registry<AbstractConversationUiEvents>;
    private readonly userData: any;

    constructor(registryMap: RegistryMap, userData: any) {
        super();

        this.userData = userData;
        this.events = registryMap["default"] as any;
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