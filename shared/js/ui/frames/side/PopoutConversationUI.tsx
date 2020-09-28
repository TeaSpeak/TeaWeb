import {Registry, RegistryMap} from "tc-shared/events";
import {ConversationUIEvents} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {ConversationPanel} from "tc-shared/ui/frames/side/ConversationUI";
import * as React from "react";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";

class PopoutConversationUI extends AbstractModal {
    private readonly events: Registry<ConversationUIEvents>;
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

    title() {
        return "Conversations";
    }
}

export = PopoutConversationUI;