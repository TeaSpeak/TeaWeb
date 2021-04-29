import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React from "react";
import {ModalChannelChatParameters} from "tc-shared/ui/modal/channel-chat/Definitions";
import {Registry} from "tc-events";
import {ChannelConversationUiEvents} from "tc-shared/ui/frames/side/ChannelConversationDefinitions";
import {ChannelTag} from "tc-shared/ui/tree/EntryTags";
import {VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {ConversationPanel} from "tc-shared/ui/frames/side/AbstractConversationRenderer";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
const cssStyle = require("./Renderer.scss");

class Modal extends AbstractModal {
    private readonly parameters: ModalChannelChatParameters;
    private readonly events: Registry<ChannelConversationUiEvents>;

    constructor(parameters: ModalChannelChatParameters) {
        super();

        this.parameters = parameters;
        this.events = Registry.fromIpcDescription(parameters.events);
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                <ConversationPanel
                    events={this.events}
                    handlerId={this.parameters.handlerId}
                    messagesDeletable={true}
                    noFirstMessageOverlay={false}
                    popoutable={false}
                />
            </div>
        );
    }

    renderTitle(): string | React.ReactElement {
        return (
            <VariadicTranslatable text={"Channel Conversation: {}"}>
                <ChannelTag
                    channelName={this.parameters.channelName}
                    channelId={this.parameters.channelId}
                    handlerId={this.parameters.handlerId}
                    style={"text-only"}
                />
            </VariadicTranslatable>
        );
    }

}

export default Modal;