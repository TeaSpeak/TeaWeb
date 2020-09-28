import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";
import {Registry, RegistryMap} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import * as React from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {ChannelTreeRenderer} from "tc-shared/ui/tree/Renderer";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {ControlBar2} from "tc-shared/ui/frames/control-bar/Renderer";

const cssStyle = require("./RendererModal.scss");
class ChannelTreeModal extends AbstractModal {
    readonly eventsTree: Registry<ChannelTreeUIEvents>;
    readonly eventsControlBar: Registry<ControlBarEvents>;

    readonly handlerId: string;

    constructor(registryMap: RegistryMap, userData: any) {
        super();

        this.handlerId = userData.handlerId;
        this.eventsTree = registryMap["tree"] as any;
        this.eventsControlBar = registryMap["controlBar"] as any;
    }

    renderBody(): React.ReactElement {
        return (
            <div className={cssStyle.container}>
                <div className={cssStyle.containerControlBar}>
                    <ControlBar2 events={this.eventsControlBar} className={cssStyle.containerControlBar} />
                </div>
                <div className={cssStyle.containerChannelTree}>
                    <ChannelTreeRenderer events={this.eventsTree} handlerId={this.handlerId} />
                </div>
            </div>
        )
    }

    title(): string | React.ReactElement<Translatable> {
        return <Translatable>Channel tree</Translatable>;
    }
}

export = ChannelTreeModal;