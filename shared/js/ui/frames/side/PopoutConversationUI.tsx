import {AbstractModal} from "tc-shared/ui/react-elements/Modal";
import {Registry} from "tc-shared/events";
import {ConversationUIEvents} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {ConversationPanel} from "tc-shared/ui/frames/side/ConversationUI";
import * as React from "react";

class PopoutConversationUI extends AbstractModal {
    private readonly events: Registry<ConversationUIEvents>;
    private readonly userData: any;

    constructor(events: Registry<ConversationUIEvents>, userData: any) {
        super();

        this.userData = userData;
        this.events = events;
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