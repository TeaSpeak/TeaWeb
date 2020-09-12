import * as React from "react";
import {useState} from "react";
import {CssEditorEvents, CssEditorUserData, CssVariable} from "tc-shared/ui/modal/css-editor/Definitions";
import {Registry} from "tc-shared/events";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {BoxedInputField, FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {Button} from "tc-shared/ui/react-elements/Button";
import {createErrorModal, createInfoModal} from "tc-shared/ui/elements/Modal";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";

const cssStyle = require("./Renderer.scss");

const CssVariableRenderer = React.memo((props: { events: Registry<CssEditorEvents>, variable: CssVariable, selected: boolean }) => {
    const [selected, setSelected] = useState(props.selected);
    const [override, setOverride] = useState(props.variable.overwriteValue);
    const [overrideColor, setOverrideColor] = useState(props.variable.customValue);

    props.events.reactUse("action_select_entry", event => setSelected(event.variable === props.variable));
    props.events.reactUse("action_override_toggle", event => {
        if (event.variableName !== props.variable.name)
            return;

        setOverride(event.enabled);
        if (event.enabled)
            setOverrideColor(event.value);
    });

    props.events.reactUse("action_change_override_value", event => {
        if (event.variableName !== props.variable.name)
            return;

        setOverrideColor(event.value);
    });

    return (
        <div
            className={cssStyle.variable + " " + (selected ? cssStyle.selected : "")}
            onClick={() => {
                if (selected)
                    return;

                props.events.fire("action_select_entry", {variable: props.variable})
            }}
        >
            <div className={cssStyle.preview}>
                <div
                    className={cssStyle.color}
                    style={{backgroundColor: props.variable.defaultValue}}
                />
            </div>
            <div className={cssStyle.preview}>
                <div
                    className={cssStyle.color}
                    style={{backgroundColor: override ? overrideColor : undefined}}
                />
            </div>
            <a>{props.variable.name}</a>
        </div>
    );
});

const CssVariableListBodyRenderer = (props: { events: Registry<CssEditorEvents> }) => {
    const [variables, setVariables] = useState<"loading" | CssVariable[]>(() => {
        props.events.fire_async("query_css_variables");
        return "loading";
    });

    const [filter, setFilter] = useState(undefined);
    const [selectedVariable, setSelectedVariable] = useState(undefined);

    props.events.reactUse("action_select_entry", event => setSelectedVariable(event.variable));
    props.events.reactUse("query_css_variables", () => setVariables("loading"));

    let content;
    if (variables === "loading") {
        content = (
            <div className={cssStyle.overlay} key={"loading"}>
                <a>
                    <Translatable>Loading</Translatable>&nbsp;
                    <LoadingDots/>
                </a>
            </div>
        );
    } else {
        content = [];
        for (const variable of variables) {
            if (filter && variable.name.toLowerCase().indexOf(filter) === -1)
                continue;

            content.push(<CssVariableRenderer
                key={"variable-" + variable.name}
                events={props.events}
                variable={variable}
                selected={selectedVariable === variable.name}
            />);
        }

        if (content.length === 0) {
            content.push(
                <div className={cssStyle.overlay} key={"no-match"}>
                    <a><Translatable>No variable matched your filter</Translatable></a>
                </div>
            );
        }
    }

    props.events.reactUse("action_set_filter", event => setFilter(event.filter?.toLowerCase()));
    props.events.reactUse("notify_css_variables", event => setVariables(event.variables));

    return (
        <div className={cssStyle.body} onKeyPress={event => {
            if (variables === "loading")
                return;

            /* TODO: This isn't working since the div isn't focused properly yet */
            let offset = 0;
            if (event.key === "ArrowDown") {
                offset = 1;
            } else if (event.key === "ArrowUp") {
                offset = -1;
            }

            if (offset !== 0) {
                const selectIndex = variables.findIndex(e => e === selectedVariable);
                if (selectIndex === -1)
                    return;

                const variable = variables[selectIndex + offset];
                if (!variable)
                    return;

                props.events.fire("action_select_entry", {variable: variable});
            }
        }} tabIndex={0}>
            {content}
        </div>
    );
};

const CssVariableListSearchRenderer = (props: { events: Registry<CssEditorEvents> }) => {
    const [isLoading, setLoading] = useState(true);

    props.events.reactUse("notify_css_variables", () => setLoading(false));
    props.events.reactUse("query_css_variables", () => setLoading(true));

    return (
        <div className={cssStyle.search}>
            <FlatInputField
                label={<Translatable>Filter variables</Translatable>}
                labelType={"floating"}
                className={cssStyle.input}
                onInput={text => props.events.fire("action_set_filter", {filter: text})}
                disabled={isLoading}
            />
        </div>
    );
};

const CssVariableListRenderer = (props: { events: Registry<CssEditorEvents> }) => (
    <div className={cssStyle.containerList}>
        <div className={cssStyle.header}>
            <a><Translatable>CSS Variable list</Translatable></a>
        </div>
        <div className={cssStyle.list} onKeyPress={event => console.error(event.key)}>
            <CssVariableListBodyRenderer events={props.events}/>
            <CssVariableListSearchRenderer events={props.events}/>
        </div>
    </div>
);

const SelectedVariableInfo = (props: { events: Registry<CssEditorEvents> }) => {
    const [selectedVariable, setSelectedVariable] = useState<CssVariable>(undefined);
    props.events.reactUse("action_select_entry", event => setSelectedVariable(event.variable));

    return (<>
        <div className={cssStyle.detail}>
            <div className={cssStyle.title}>
                <Translatable>Name</Translatable>
            </div>
            <div className={cssStyle.value}>
                <BoxedInputField
                    editable={false}
                    value={selectedVariable ? selectedVariable.name : "-"}
                />
            </div>
        </div>
        <div className={cssStyle.detail}>
            <div className={cssStyle.title}>
                <Translatable>Default Value</Translatable>
            </div>
            <div className={cssStyle.value}>
                <BoxedInputField
                    editable={false}
                    value={selectedVariable ? selectedVariable.defaultValue : "-"}
                />
            </div>
        </div>
    </>);
};

const OverrideVariableInfo = (props: { events: Registry<CssEditorEvents> }) => {
    const [selectedVariable, setSelectedVariable] = useState<CssVariable>(undefined);
    const [overwriteValue, setOverwriteValue] = useState<string>(undefined);
    const [overwriteEnabled, setOverwriteEnabled] = useState(false);

    props.events.reactUse("action_select_entry", event => {
        setSelectedVariable(event.variable);
        setOverwriteEnabled(event.variable?.overwriteValue);
        setOverwriteValue(event.variable?.customValue);
    });

    props.events.reactUse("action_override_toggle", event => {
        if (event.variableName !== selectedVariable?.name)
            return;

        selectedVariable.overwriteValue = event.enabled;
        setOverwriteEnabled(event.enabled);
        if (event.enabled)
            setOverwriteValue(event.value);
    });

    props.events.reactUse("action_change_override_value", event => {
        if (event.variableName !== selectedVariable?.name)
            return;

        setOverwriteValue(event.value);
    });

    return (<>
        <div className={cssStyle.detail}>
            <div className={cssStyle.title}>
                <Translatable>Override Value</Translatable>
                <Checkbox
                    value={overwriteEnabled}
                    disabled={!selectedVariable}
                    onChange={value => {
                        props.events.fire("action_override_toggle", {
                            variableName: selectedVariable.name,
                            value: typeof selectedVariable.customValue === "string" ? selectedVariable.customValue : selectedVariable.defaultValue,
                            enabled: value
                        });
                    }}
                />
            </div>
            <div className={cssStyle.value + " " + cssStyle.color}>
                <BoxedInputField
                    className={cssStyle.input}
                    disabled={!overwriteEnabled}
                    value={overwriteValue || " "}
                    onInput={text => {
                        selectedVariable.customValue = text;
                        props.events.fire("action_change_override_value", {
                            value: text,
                            variableName: selectedVariable.name
                        });
                    }}
                />
                <CssVariableColorPicker events={props.events} selectedVariable={selectedVariable}/>
            </div>
        </div>
    </>);
};

const CssVariableColorPicker = (props: { events: Registry<CssEditorEvents>, selectedVariable: CssVariable }) => {
    const [overwriteValue, setOverwriteValue] = useState<string>(undefined);
    const [overwriteEnabled, setOverwriteEnabled] = useState(false);

    props.events.reactUse("action_override_toggle", event => {
        if (event.variableName !== props.selectedVariable?.name)
            return;

        props.selectedVariable.overwriteValue = event.enabled;
        setOverwriteEnabled(event.enabled);
        if (event.enabled)
            setOverwriteValue(event.value);
    });

    props.events.reactUse("action_change_override_value", event => {
        if (event.variableName !== props.selectedVariable?.name || 'cpInvoker' in event)
            return;

        setOverwriteValue(event.value);
    });

    let currentInput: string;
    let inputTimeout: number;
    return (
        <label className={cssStyle.colorButton}>
            <input
                disabled={!overwriteEnabled}
                type={"color"}
                value={overwriteValue}
                onChange={event => {
                    currentInput = event.target.value;
                    if (inputTimeout)
                        return;

                    inputTimeout = setTimeout(() => {
                        inputTimeout = undefined;
                        props.events.fire("action_change_override_value", {
                            value: currentInput,
                            variableName: props.selectedVariable.name
                        });
                    }, 150);
                }}
            />
            <a className="rainbow-letter" style={{borderBottomColor: overwriteValue}}>C</a>
        </label>
    )
};

const ControlButtons = (props: { events: Registry<CssEditorEvents> }) => {
    return (
        <div className={cssStyle.buttons}>
            <Button
                color={"blue"}
                type={"normal"}
                className={cssStyle.button}
                onClick={() => props.events.fire("action_randomize")}
            ><Translatable>Randomize</Translatable></Button>
            <Button
                color={"red"}
                type={"normal"}
                className={cssStyle.button + " " + cssStyle.buttonReset}
                onClick={() => props.events.fire("action_reset")}
            ><Translatable>Reset</Translatable></Button>
            <Button
                color={"blue"}
                type={"normal"}
                className={cssStyle.button}
                onClick={event => props.events.fire("action_export", {allValues: event.shiftKey})}
                title={tr("Click to export the changed values, Shift click to export all values")}
            ><Translatable>Export</Translatable></Button>
            <Button
                color={"green"}
                type={"normal"}
                className={cssStyle.button}
                onClick={() => requestFileAsText().then(content => {
                    props.events.fire("action_import", {config: content})
                })}
            ><Translatable>Import</Translatable></Button>
        </div>
    )
};

const CssVariableEditor = (props: { events: Registry<CssEditorEvents> }) => {
    return (
        <div className={cssStyle.containerEdit}>
            <div className={cssStyle.header}>
                <a><Translatable>Variable details</Translatable></a>
            </div>
            <SelectedVariableInfo events={props.events}/>
            <OverrideVariableInfo events={props.events}/>
            <ControlButtons events={props.events}/>
        </div>
    )
};
const downloadTextAsFile = (text, name) => {
    const element = document.createElement("a");
    element.text = "download";
    element.href = "data:test/plain;charset=utf-8," + encodeURIComponent(text);
    element.download = name;
    element.style.display = "none";

    document.body.appendChild(element);
    element.click();
    element.remove();
};

const requestFileAsText = async (): Promise<string> => {
    const element = document.createElement("input");
    element.style.display = "none";
    element.type = "file";

    document.body.appendChild(element);
    element.click();
    await new Promise(resolve => {
        element.onchange = resolve;
    });

    if (element.files.length !== 1)
        return undefined;
    const file = element.files[0];
    element.remove();

    return await file.text();
};

class PopoutConversationUI extends AbstractModal {
    private readonly events: Registry<CssEditorEvents>;
    private readonly userData: CssEditorUserData;

    constructor(events: Registry<CssEditorEvents>, userData: CssEditorUserData) {
        super();

        this.userData = userData;
        this.events = events;

        this.events.on("notify_export_result", event => {
            createInfoModal(tr("Config exported successfully"), tr("The config has been exported successfully.")).open();
            downloadTextAsFile(event.config, "teaweb-style.json");
        });
        this.events.on("notify_import_result", event => {
            if (event.success)
                createInfoModal(tr("Config imported successfully"), tr("The config has been imported successfully.")).open();
            else
                createErrorModal(tr("Config imported failed"), tr("The config import has been failed.")).open();
        })
    }

    renderBody() {
        return (
            <div className={cssStyle.container}>
                <CssVariableListRenderer events={this.events}/>
                <CssVariableEditor events={this.events}/>
            </div>
        );
    }

    title() {
        return "CSS Variable editor";
    }
}

export = PopoutConversationUI;