import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import * as React from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Registry} from "tc-shared/events";
import {
    ChannelEditableProperty,
    ChannelEditEvents,
    ChannelPropertyPermission
} from "tc-shared/ui/modal/channel-edit/Definitions";
import {useContext, useState} from "react";
import {BoxedInputField} from "tc-shared/ui/react-elements/InputField";

const cssStyle = require("./Renderer.scss");

const ModalTypeContext = React.createContext<"channel-edit" | "channel-create">("channel-edit");
const EventContext = React.createContext<Registry<ChannelEditEvents>>(undefined);

type ChannelPropertyState<T extends keyof ChannelEditableProperty> = {
    setPropertyValue: (value: ChannelEditableProperty[T]) => void
} & ({
    propertyState: "loading",
    propertyValue: undefined,
} | {
    propertyState: "normal" | "applying",
    propertyValue: ChannelEditableProperty[T],
})

const kPropertyLoading = "____loading_____";
function useProperty<T extends keyof ChannelEditableProperty>(property: T) : ChannelPropertyState<T> {
    const events = useContext(EventContext);

    const [ value, setValue ] = useState<ChannelEditableProperty[T] | typeof kPropertyLoading>(() => {
        events.fire("query_property", { property: property });
        return kPropertyLoading;
    });

    events.reactUse("notify_property", event => {
        if(event.property !== property) {
            return;
        }

        setValue(event.value as any);
    }, undefined, []);

    if(value === kPropertyLoading) {
        return {
            propertyState: "loading",
            propertyValue: undefined,
            setPropertyValue: _value => {}
        };
    } else {
        return {
            propertyState: "normal",
            propertyValue: value,
            setPropertyValue: setValue as any
        };
    }
}

function usePermission<T extends keyof ChannelPropertyPermission>(permission: T, defaultValue: ChannelPropertyPermission[T]) : ChannelPropertyPermission[T] {
    const events = useContext(EventContext);
    const [ value, setValue ] = useState<ChannelPropertyPermission[T]>(() => {
        events.fire("query_property_permission", { permission: permission });
        return defaultValue;
    });

    events.reactUse("notify_property_permission", event => event.permission === permission && setValue(event.value as any));

    return value;
}

const ChannelName = () => {
    const modalType = useContext(ModalTypeContext);
    const { propertyValue, propertyState, setPropertyValue } = useProperty("name");
    const editable = usePermission("name", modalType === "channel-create");
    const [ edited, setEdited ] = useState(false);

    return (
        <BoxedInputField
            disabled={!editable || propertyState !== "normal"}
            value={propertyValue}
            placeholder={propertyState === "normal" ? tr("Channel name") : tr("loading")}
            onInput={value => {
                setPropertyValue(value);
                setEdited(true);
            }}
            isInvalid={edited && (typeof propertyValue !== "string" || !propertyValue || propertyValue.length > 30)}
        />
    );
}

const GeneralContainer = () => {
    return (
        <div className={cssStyle.containerGeneral}>
            <ChannelName />
        </div>
    );
}

export class ChannelEditModal extends InternalModal {
    private readonly events: Registry<ChannelEditEvents>;
    private readonly isChannelCreate: boolean;

    constructor(events: Registry<ChannelEditEvents>, isChannelCreate: boolean) {
        super();
        this.events = events;
        this.isChannelCreate = isChannelCreate;
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <ModalTypeContext.Provider value={this.isChannelCreate ? "channel-create" : "channel-edit"}>
                    <GeneralContainer />
                </ModalTypeContext.Provider>
            </EventContext.Provider>
        );
    }

    title(): string | React.ReactElement {
        return <Translatable key={"create"}>Create channel</Translatable>;
    }
}