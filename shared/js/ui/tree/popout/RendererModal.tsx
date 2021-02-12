import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";
import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import * as React from "react";
import {useState} from "react";
import {ChannelTreeRenderer} from "tc-shared/ui/tree/Renderer";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {ControlBar2} from "tc-shared/ui/frames/control-bar/Renderer";
import {ChannelTreePopoutConstructorArguments, ChannelTreePopoutEvents} from "tc-shared/ui/tree/popout/Definitions";

const TitleRenderer = (props: { events: Registry<ChannelTreePopoutEvents> }) => {
    const [ title, setTitle ] = useState<string>(() => {
        props.events.fire("query_title");
        return tr("Channel tree popout");
    });

    props.events.reactUse("notify_title", event => setTitle(event.title));
    return <>{title}</>;
}

const cssStyle = require("./RendererModal.scss");
class ChannelTreeModal extends AbstractModal {
    readonly eventsUI: Registry<ChannelTreePopoutEvents>;
    readonly eventsTree: Registry<ChannelTreeUIEvents>;
    readonly eventsControlBar: Registry<ControlBarEvents>;

    readonly handlerId: string;

    constructor(info: ChannelTreePopoutConstructorArguments) {
        super();

        this.handlerId = info.handlerId;
        this.eventsUI = Registry.fromIpcDescription(info.events);
        this.eventsTree = Registry.fromIpcDescription(info.eventsTree);
        this.eventsControlBar = Registry.fromIpcDescription(info.eventsControlBar);

        this.eventsUI.fire("query_title");
    }

    protected onDestroy() {
        super.onDestroy();
    }

    renderBody(): React.ReactElement {
        return (
            <div className={cssStyle.container}>
                <ControlBar2 events={this.eventsControlBar} className={cssStyle.containerControlBar} />
                <div className={cssStyle.containerChannelTree}>
                    <ChannelTreeRenderer events={this.eventsTree} handlerId={this.handlerId} />
                </div>
            </div>
        )
    }

    renderTitle(): React.ReactElement {
        return <TitleRenderer events={this.eventsUI} />;
    }
}

export = ChannelTreeModal;