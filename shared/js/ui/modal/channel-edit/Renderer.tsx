import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import * as React from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Registry} from "tc-shared/events";
import {ChannelEditableProperty, ChannelEditEvents} from "tc-shared/ui/modal/channel-edit/Definitions";
import {useContext, useState} from "react";
import {BoxedInputField} from "tc-shared/ui/react-elements/InputField";

const cssStyle = require("./Renderer.scss");

const EventContext = React.createContext<Registry<ChannelEditEvents>>(undefined);
const ChangesApplying = React.createContext(false);

const kPropertyLoading = "loading";

function useProperty<T extends keyof ChannelEditableProperty>(property: T) : {
    originalValue: ChannelEditableProperty[T],
    currentValue: ChannelEditableProperty[T],
    setCurrentValue: (value: ChannelEditableProperty[T]) => void
} | typeof kPropertyLoading {
    const events = useContext(EventContext);

    const [ value, setValue ] = useState(() => {
        events.fire("query_property", { property: property });
        return kPropertyLoading;
    });

    events.reactUse("notify_property", event => {
        if(event.property !== property) {
            return;
        }

        setValue(event.value as any);
    }, undefined, []);

    return kPropertyLoading;
}

const ChannelName = () => {
    const changesApplying = useContext(ChangesApplying);
    const property = useProperty("name");

    return (
        <BoxedInputField
            disabled={changesApplying || property === kPropertyLoading}
            value={property === kPropertyLoading ? null : property.currentValue}
            placeholder={property === kPropertyLoading ? tr("loading") : tr("Channel name")}
            onInput={newValue => property !== kPropertyLoading && property.setCurrentValue(newValue)}
        />
    )
}

const GeneralContainer = () => {
    return (
        <div className={cssStyle.containerGeneral}>
            <ChannelName />
        </div>
    );
}

export class ChannelEditModal extends InternalModal {
    private readonly channelExists: number;

    renderBody(): React.ReactElement {
        return (<>
            <GeneralContainer />
        </>);
    }

    title(): string | React.ReactElement {
        return <Translatable key={"create"}>Create channel</Translatable>;
    }
}