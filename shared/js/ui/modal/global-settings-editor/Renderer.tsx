import {Translatable} from "tc-shared/ui/react-elements/i18n";
import * as React from "react";
import {createContext, useContext, useRef, useState} from "react";
import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {ModalGlobalSettingsEditorEvents, Setting} from "tc-shared/ui/modal/global-settings-editor/Definitions";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";

const ModalEvents = createContext<Registry<ModalGlobalSettingsEditorEvents>>(undefined);
const cssStyle = require("./Renderer.scss");

const SettingInfoRenderer = (props: { children: [React.ReactNode, React.ReactNode ], className?: string }) => (
    <div className={cssStyle.info + " " + (props.className || "")}>
        <div className={cssStyle.title}>{props.children[0]}</div>
        <div className={cssStyle.value}>{props.children[1]}</div>
    </div>
);

const SettingEditor = () => {
    const events = useContext(ModalEvents);

    const [ isApplying, setApplying ] = useState(false);
    const [ currentValue, setCurrentValue ] = useState<string>();
    const [ currentSetting, setCurrentSetting ] = useState<Setting | "not-found">(undefined);
    const currentSettingKey = useRef<string>();

    events.reactUse("notify_selected_setting", event => {
        if(event.setting === currentSettingKey.current) {
            return;
        }

        currentSettingKey.current = event.setting;
        events.fire("query_setting", { setting: event.setting });
    });

    events.reactUse("notify_setting", event => {
        if(event.setting !== currentSettingKey.current) {
            return;
        }

        setApplying(false);
        if(event.status === "not-found") {
            setCurrentSetting("not-found");
        } else {
            setCurrentValue(event.value);
            setCurrentSetting(event.info);
        }
    });

    events.reactUse("action_set_value", event => {
        if(event.setting !== currentSettingKey.current) {
            return;
        }

        setApplying(true);
    });

    events.reactUse("notify_setting_value", event => {
        if(event.setting !== currentSettingKey.current) {
            return;
        }

        setApplying(false);
        setCurrentValue(event.value);
    });

    if(currentSetting === "not-found") {
        return null;
    } else if(!currentSetting) {
        return null;
    }

    return (
        <div className={cssStyle.body + " " + cssStyle.editor}>
            <SettingInfoRenderer>
                <Translatable>Setting key</Translatable>
                {currentSetting.key}
            </SettingInfoRenderer>
            <SettingInfoRenderer className={cssStyle.infoDescription}>
                <Translatable>Description</Translatable>
                {currentSetting.description}
            </SettingInfoRenderer>
            <SettingInfoRenderer className={cssStyle}>
                <Translatable>Default Value</Translatable>
                {typeof currentSetting.defaultValue !== "undefined" ? (currentSetting.defaultValue + "") : tr("unset")}
            </SettingInfoRenderer>
            <SettingInfoRenderer className={cssStyle.infoValue}>
                <Translatable>Value</Translatable>
                <FlatInputField
                    className={cssStyle.input}
                    value={isApplying ? "" : typeof currentValue !== "undefined" ? currentValue + "" : ""}
                    editable={!isApplying}
                    placeholder={isApplying ? tr("applying...") : tr("unset")}
                    onChange={text => {
                        setCurrentValue(text);
                    }}
                    finishOnEnter={true}
                    onBlur={() => {
                        events.fire("action_set_value", { setting: currentSettingKey.current, value: currentValue });
                    }}
                />
            </SettingInfoRenderer>
        </div>
    );
}

const SettingEntryRenderer = (props: { setting: Setting, selected: boolean }) => {
    const events = useContext(ModalEvents);

    return (
        <div className={cssStyle.entry + " " + (props.selected ? cssStyle.selected : "")} onClick={() => events.fire("action_select_setting", { setting: props.setting.key })}>
            {props.setting.key}
        </div>
    );
}

const SettingList = () => {
    const events = useContext(ModalEvents);
    const [ settings, setSettings ] = useState<"loading" | Setting[]>(() => {
        events.fire("query_settings");
        return "loading";
    });
    const [ selectedSetting, setSelectedSetting ] = useState<string>(undefined);
    const [ filter, setFilter ] = useState<string>(undefined);

    events.reactUse("notify_settings", event => setSettings(event.settings));
    events.reactUse("notify_selected_setting", event => setSelectedSetting(event.setting));
    events.reactUse("action_set_filter", event => setFilter((event.filter || "").toLowerCase()));

    return (
        <div className={cssStyle.body + " " + cssStyle.list}>
            <div className={cssStyle.entries}>
                {settings === "loading" ? undefined :
                    settings.map(setting => {
                        filterBlock:
                        if(filter) {
                            if(setting.key.toLowerCase().indexOf(filter) !== -1) {
                                break filterBlock;
                            }

                            if(setting.description && setting.description.toLowerCase().indexOf(filter) !== -1) {
                                break filterBlock;
                            }

                            return undefined;
                        }
                        return <SettingEntryRenderer setting={setting} selected={setting.key === selectedSetting} key={setting.key} />;
                    })
                }
            </div>
            <div className={cssStyle.filter}>
                <FlatInputField className={cssStyle.input} onInput={text => events.fire("action_set_filter", { filter: text })} placeholder={tr("Filter settings")} />
            </div>
            <div className={cssStyle.overlay + " " + (settings === "loading" ? cssStyle.shown : "")}>
                <a><Translatable>loading</Translatable> <LoadingDots /></a>
            </div>
        </div>
    );
}

class ModalGlobalSettingsEditor extends AbstractModal {
    protected readonly events: Registry<ModalGlobalSettingsEditorEvents>;

    constructor(events: IpcRegistryDescription<ModalGlobalSettingsEditorEvents>) {
        super();

        this.events = Registry.fromIpcDescription(events);
    }

    renderBody(): React.ReactElement {
        return (
            <ModalEvents.Provider value={this.events}>
                <div className={cssStyle.container}>
                    <div className={cssStyle.subContainer + " " + cssStyle.containerList}>
                        <div className={cssStyle.header}>
                            <a><Translatable>Setting list</Translatable></a>
                        </div>
                        <SettingList />
                    </div>
                    <div className={cssStyle.subContainer + " " + cssStyle.containerEdit}>
                        <div className={cssStyle.header}>
                            <a><Translatable>Setting editor</Translatable></a>
                        </div>
                        <SettingEditor />
                    </div>
                </div>
            </ModalEvents.Provider>
        );
    }

    renderTitle(): string | React.ReactElement<Translatable> {
        return <Translatable>Global settings registry</Translatable>;
    }
}

export = ModalGlobalSettingsEditor;