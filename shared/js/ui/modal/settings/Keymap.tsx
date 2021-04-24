import * as ppt from "tc-shared/PPTListener";
import {KeyDescriptor} from "tc-shared/PPTListener";
import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import * as React from "react";
import {useRef} from "react";
import {Button} from "tc-shared/ui/react-elements/Button";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {KeyTypes, TypeCategories} from "tc-shared/KeyControl";
import {IconRenderer} from "tc-shared/ui/react-elements/Icon";
import {spawnKeySelect} from "tc-shared/ui/modal/ModalKeySelect";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {tra} from "tc-shared/i18n/localize";
import * as keycontrol from "./../../../KeyControl";
import {MenuEntryType, spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {LogCategory, logWarn} from "tc-shared/log";

const cssStyle = require("./Keymap.scss");

export interface KeyMapEvents {
    query_keymap: {
        action: string,
        query_type: "query-selected" | "general"
    },
    query_keymap_result: {
        action: string,
        status: "success" | "error" | "timeout",

        error?: string,
        key?: KeyDescriptor
    },

    set_keymap: {
        action: string,
        key?: KeyDescriptor
    },
    set_keymap_result: {
        action: string,
        status: "success" | "error" | "timeout",
        error?: string,
        key?: KeyDescriptor
    },

    set_selected_action: {
        action: string
    }
}

interface KeyActionEntryState {
    assignedKey: KeyDescriptor | undefined;
    selected: boolean;
    state: "loading" | "applying" | "loaded" | "error";
    error?: string;
}

interface KeyActionEntryProperties {
    action: string;
    icon: string;
    description: string;
    eventRegistry: Registry<KeyMapEvents>;
    hidden: boolean;
}

@ReactEventHandler(e => e.props.eventRegistry)
class KeyActionEntry extends ReactComponentBase<KeyActionEntryProperties, KeyActionEntryState> {
    protected defaultState(): KeyActionEntryState {
        return {
            assignedKey: undefined,
            selected: false,
            state: "loading"
        };
    }

    componentDidMount(): void {
        this.props.eventRegistry.fire("query_keymap", {action: this.props.action, query_type: "general"});
    }

    render() {
        let rightItem;
        if (this.state.state === "loading") {
            rightItem =
                <div key={"status-loading"} className={cssStyle.status}><Translatable>loading...</Translatable></div>;
        } else if (this.state.state === "applying") {
            rightItem =
                <div key={"status-applying"} className={cssStyle.status}><Translatable>applying...</Translatable></div>;
        } else if (this.state.state === "loaded") {
            rightItem = null;
            if (this.state.assignedKey)
                rightItem = <div className={cssStyle.key}>{ppt.getKeyDescription(this.state.assignedKey)}</div>;
        } else {
            rightItem =
                <div key={"status-error"} className={this.classList(cssStyle.status, cssStyle.error)}><Translatable
                    trIgnore={true}>{this.state.error || "unknown error"}</Translatable></div>;
        }
        return (
            <div
                key={"action-" + this.props.action}
                className={this.classList(cssStyle.row, cssStyle.entry, this.state.selected ? cssStyle.selected : "")}
                onClick={() => this.onClick()}
                onDoubleClick={() => this.onDoubleClick()}
                hidden={this.props.hidden}
                onContextMenu={e => this.onContextMenu(e)}
            >
                <IconRenderer icon={this.props.icon}/>
                <a><Translatable trIgnore={true}>{this.props.description}</Translatable></a>
                {rightItem}
            </div>
        );
    }

    private onClick() {
        this.props.eventRegistry.fire("set_selected_action", {action: this.props.action});
    }

    private onDoubleClick() {
        spawnKeySelect(key => {
            if (!key) return;

            this.props.eventRegistry.fire("set_keymap", {action: this.props.action, key: key});
        });
    }

    private onContextMenu(event) {
        event.preventDefault();

        spawn_context_menu(event.pageX, event.pageY, {
            type: MenuEntryType.ENTRY,
            name: tr("Set key"),
            icon_class: "client-hotkeys",
            callback: () => this.onDoubleClick()
        }, {
            type: MenuEntryType.ENTRY,
            name: tr("Remove key"),
            icon_class: "client-delete",
            callback: () => this.props.eventRegistry.fire("set_keymap", {action: this.props.action, key: undefined}),
            visible: !!this.state.assignedKey
        });
    }

    @EventHandler<KeyMapEvents>("set_selected_action")
    private handleSelectedChange(event: KeyMapEvents["set_selected_action"]) {
        this.setState({
            selected: this.props.action === event.action
        });
    }

    @EventHandler<KeyMapEvents>("query_keymap")
    private handleQueryKeymap(event: KeyMapEvents["query_keymap"]) {
        if (event.action !== this.props.action) return;
        if (event.query_type !== "general") return;

        this.setState({
            state: "loading"
        });
    }

    @EventHandler<KeyMapEvents>("query_keymap_result")
    private handleQueryKeymapResult(event: KeyMapEvents["query_keymap_result"]) {
        if (event.action !== this.props.action) return;

        if (event.status === "success") {
            this.setState({
                state: "loaded",
                assignedKey: event.key
            });
        } else {
            this.setState({
                state: "error",
                error: event.status === "timeout" ? tr("query timeout") : event.error
            });
        }
    }

    @EventHandler<KeyMapEvents>("set_keymap")
    private handleSetKeymap(event: KeyMapEvents["set_keymap"]) {
        if (event.action !== this.props.action) return;

        this.setState({state: "applying"});
    }

    @EventHandler<KeyMapEvents>("set_keymap_result")
    private handleSetKeymapResult(event: KeyMapEvents["set_keymap_result"]) {
        if (event.action !== this.props.action) return;

        if (event.status === "success") {
            this.setState({
                state: "loaded",
                assignedKey: event.key
            });
        } else {
            this.setState({state: "loaded"});
            createErrorModal(tr("Failed to change key"), tra("Failed to change key for action \"{}\":\n{}", this.props.action, event.status === "timeout" ? tr("timeout") : event.error));
        }
    }
}

interface KeyActionGroupProperties {
    id: string;
    name: string;
    eventRegistry: Registry<KeyMapEvents>;
}

class KeyActionGroup extends ReactComponentBase<KeyActionGroupProperties, { collapsed: boolean }> {
    protected defaultState(): { collapsed: boolean } {
        return {collapsed: false}
    }

    render() {
        const result = [];
        result.push(<div key={"category-" + this.props.id} className={this.classList(cssStyle.row, cssStyle.category)}
                         onClick={() => this.toggleCollapsed()}>
            <div className={this.classList("arrow", this.state.collapsed ? "right" : "down")}/>
            <a><Translatable trIgnore={true}>{this.props.name}</Translatable></a>
        </div>);

        result.push(...Object.keys(KeyTypes).filter(e => KeyTypes[e].category === this.props.id).map(e => (
            <KeyActionEntry hidden={this.state.collapsed} key={e} action={e} icon={KeyTypes[e].icon}
                            description={KeyTypes[e].description} eventRegistry={this.props.eventRegistry}/>
        )));
        return result;
    }

    private toggleCollapsed() {
        this.setState({
            collapsed: !this.state.collapsed
        });
    }
}

interface KeyActionListProperties {
    eventRegistry: Registry<KeyMapEvents>;
}

class KeyActionList extends ReactComponentBase<KeyActionListProperties, {}> {
    protected defaultState(): {} {
        return {};
    }

    render() {
        const categories = [];

        for (const category of Object.keys(TypeCategories)) {
            categories.push(<KeyActionGroup eventRegistry={this.props.eventRegistry} key={category} id={category}
                                            name={TypeCategories[category].name}/>)
        }

        return (
            <div className={cssStyle.elements}>
                {categories}
            </div>
        )
    }
}

interface ButtonBarState {
    active_action: string | undefined;
    loading: boolean;
    has_key: boolean;
}

@ReactEventHandler(e => e.props.event_registry)
class ButtonBar extends ReactComponentBase<{ event_registry: Registry<KeyMapEvents> }, ButtonBarState> {
    protected defaultState(): ButtonBarState {
        return {
            active_action: undefined,
            loading: true,
            has_key: false
        };
    }

    render() {
        return (
            <div className={cssStyle.buttons}>
                <Button color={"red"} disabled={!this.state.active_action || this.state.loading || !this.state.has_key}
                        onClick={() => this.onButtonClick()}>
                    <Translatable>Clear Key</Translatable>
                </Button>
            </div>
        );
    }

    @EventHandler<KeyMapEvents>("set_selected_action")
    private handleSetSelectedAction(event: KeyMapEvents["set_selected_action"]) {
        this.setState({
            active_action: event.action,
            loading: true
        }, () => {
            this.props.event_registry.fire("query_keymap", {action: event.action, query_type: "query-selected"});
        });
    }

    @EventHandler<KeyMapEvents>("query_keymap_result")
    private handleQueryKeymapResult(event: KeyMapEvents["query_keymap_result"]) {
        this.setState({
            loading: false,
            has_key: event.status === "success" && !!event.key
        });
    }

    private onButtonClick() {
        this.props.event_registry.fire("set_keymap", {action: this.state.active_action, key: undefined});
    }
}

export const KeyMapSettings = () => {
    const events = useRef<Registry<KeyMapEvents>>(undefined);

    if (events.current === undefined) {
        events.current = new Registry<KeyMapEvents>();
        initialize_timeouts(events.current);
        initialize_controller(events.current);
    }

    return (<>
        <div key={"header"} className={cssStyle.header}>
            <a><Translatable>Keymap</Translatable></a>
        </div>
        <div key={"body"} className={cssStyle.containerList}>
            <KeyActionList eventRegistry={events.current}/>
            <ButtonBar event_registry={events.current}/>
        </div>
    </>);
};

function initialize_timeouts(event_registry: Registry<KeyMapEvents>) {
    /* query */
    {
        let timeouts = {};
        event_registry.on("query_keymap", event => {
            clearTimeout(timeouts[event.action]);
            timeouts[event.action] = setTimeout(() => {
                event_registry.fire("query_keymap_result", {action: event.action, status: "timeout"});
            }, 5000);
        });
        event_registry.on("query_keymap_result", event => {
            clearTimeout(timeouts[event.action]);
            delete timeouts[event.action];
        });
    }

    /* change */
    {
        let timeouts = {};
        event_registry.on("set_keymap", event => {
            clearTimeout(timeouts[event.action]);
            timeouts[event.action] = setTimeout(() => {
                event_registry.fire("set_keymap_result", {action: event.action, status: "timeout"});
            }, 5000);
        });

        event_registry.on("set_keymap_result", event => {
            clearTimeout(timeouts[event.action]);
            delete timeouts[event.action];
        });
    }
}

function initialize_controller(event_registry: Registry<KeyMapEvents>) {
    event_registry.on("query_keymap", event => {
        event_registry.fire_react("query_keymap_result", {
            status: "success",
            action: event.action,
            key: keycontrol.key(event.action)
        });
    });

    event_registry.on("set_keymap", event => {
        try {
            keycontrol.setKey(event.action, event.key);
            event_registry.fire_react("set_keymap_result", {status: "success", action: event.action, key: event.key});
        } catch (error) {
            logWarn(LogCategory.GENERAL, tr("Failed to change key for action %s: %o"), event.action, error);
            event_registry.fire_react("set_keymap_result", {
                status: "error",
                action: event.action,
                error: error instanceof Error ? error.message : error?.toString()
            });
        }
    })
}