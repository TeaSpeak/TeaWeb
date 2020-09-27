import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {
    closeContextMenu,
    ContextMenuEntry,
    ContextMenuEntryNormal,
    ContextMenuFactory, MenuEntryLabel,
} from "tc-shared/ui/context-menu/index";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {IconRenderer, RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {useContext} from "react";

const cssStyle = require("./ReactRenderer.scss");
const CloseCallback = React.createContext<() => void>(undefined);

let globalMouseListener;
let globalContainer: HTMLDivElement;
let refRenderer = React.createRef<ContextMenuRenderer>();

const MenuEntryIconRenderer = (props: { entry: ContextMenuEntryNormal }) => {
    if(!props.entry.icon || typeof props.entry.icon === "string") {
        return <IconRenderer icon={props.entry.icon as any} className={cssStyle.icon} />;
    } else {
        return <RemoteIconRenderer icon={props.entry.icon} className={cssStyle.icon} />;
    }
};

const MenuLabelRenderer = (props: { label: MenuEntryLabel }) => {
    let text;
    let classes = [];
    if(typeof props.label === "string") {
        text = props.label;
    } else {
        text = props.label.text;
        if(props.label.bold) {
            classes.push(cssStyle.bold);
        }
    }

    classes.push(cssStyle.label);
    return <div className={classes.join(" ")}>{text}</div>;
}

const MenuEntryRenderer = (props: { entry: ContextMenuEntry }) => {
    const closeCallback = useContext(CloseCallback);
    const clickListener = () => {
        closeCallback();

        if("click" in props.entry && typeof props.entry.click === "function") {
            props.entry.click();
        }
    };

    if(typeof props.entry.visible === "boolean" && !props.entry.visible) { return null; }
    switch (props.entry.type) {
        case "separator":
            return <hr key={"hr"} />;

        case "checkbox":
            return (
                <div
                    className={cssStyle.entry + " " + (typeof props.entry.enabled === "boolean" && !props.entry.enabled ? cssStyle.disabled : "")}
                    onClick={clickListener}
                >
                    <label className={cssStyle.checkbox}>
                        <input type={"checkbox"} checked={props.entry.checked || false} readOnly={true} />
                        <span className={cssStyle.checkmark} />
                    </label>
                    <MenuLabelRenderer label={props.entry.label} />
                </div>
            );

        case "normal":
            return (
                <div
                    className={cssStyle.entry + " " + (props.entry.subMenu?.length ? cssStyle.subContainer : "") + " " + (typeof props.entry.enabled === "boolean" && !props.entry.enabled ? cssStyle.disabled : "")}
                    onClick={clickListener}
                >
                    <MenuEntryIconRenderer entry={props.entry} />
                    <MenuLabelRenderer label={props.entry.label} />
                    {!props.entry.subMenu?.length ? undefined :
                        <React.Fragment>
                            <div className={cssStyle.arrow} />
                            <MenuRenderer entries={props.entry.subMenu} subMenu={true} />
                        </React.Fragment>
                    }
                </div>
            );
    }
    return null;
}

const MenuRenderer = (props: { entries: ContextMenuEntry[], subMenu: boolean }) => {
    return (
        <div className={cssStyle.menuContainer + " " + (props.subMenu ? cssStyle.subMenu : "")}>
            {props.entries.map(entry => <MenuEntryRenderer entry={entry} key={entry.uniqueId} />)}
        </div>
    )
};

class ContextMenuRenderer extends React.Component<{}, {  entries: ContextMenuEntry[], pageX: number, pageY: number, callbackClose: () => void }> {
    constructor(props) {
        super(props);

        this.state = {
            pageY: 0,
            pageX: 0,
            entries: [],
            callbackClose: () => {}
        }
    }

    render() {
        return (
            <CloseCallback.Provider value={() => {
                if(this.state.callbackClose) {
                    this.state.callbackClose();
                }
                this.setState({ entries: [], callbackClose: undefined });
            }}>
                <div
                    className={cssStyle.container + " " + (this.state.entries.length ? cssStyle.shown : "")}
                    style={{ top: this.state.pageY, left: this.state.pageX }}
                >
                    <MenuRenderer entries={this.state.entries} subMenu={false} />
                </div>
            </CloseCallback.Provider>
        )
    }
}

let uniqueIdIndex = 0;
function generateUniqueIds(entry: ContextMenuEntry) {
    if(typeof entry.uniqueId !== "string") {
        entry.uniqueId = "_" + (++uniqueIdIndex);
    }

    if(entry.type === "normal" && entry.subMenu) {
        entry.subMenu.forEach(generateUniqueIds);
    }
}

export let reactContextMenuInstance: ContextMenuFactory;
loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 80,
    name: "context menu init",
    function: async () => {
        document.addEventListener("mousedown", globalMouseListener = event => {
            if(refRenderer.current?.state.entries?.length) {
                let target: HTMLElement = event.target as any;
                while (target) {
                    if(target.classList.contains(cssStyle.container)) {
                        return;
                    }

                    target = target.parentElement;
                }

                closeContextMenu();
            }
        });

        globalContainer = document.createElement("div");
        globalContainer.classList.add(cssStyle.globalContainer);
        document.body.append(globalContainer);

        ReactDOM.render(<ContextMenuRenderer ref={refRenderer} />, globalContainer);

        reactContextMenuInstance = new class implements ContextMenuFactory {
            spawnContextMenu(position: { pageX: number; pageY: number }, entries: ContextMenuEntry[]) {
                entries.forEach(generateUniqueIds);
                refRenderer.current?.setState({
                    entries: entries,
                    pageX: position.pageX,
                    pageY: position.pageY
                });
            }

            closeContextMenu() {
                if(refRenderer.current?.state.entries?.length) {
                    refRenderer.current?.setState({ callbackClose: undefined, entries: [] });
                }
            }
        };

        /*
        setTimeout(() => {
            spawnContextMenu({ pageX: 100, pageY: 100 }, [
                {
                    type: "normal",
                    label: { text: "test", bold: true },
                    icon: ClientIcon.IsTalker
                },
                {
                    type: "normal",
                    label: "test 2",
                    icon: ClientIcon.ServerGreen
                },
                {
                    type: "separator"
                },
                {
                    type: "normal",
                    label: "test 3",
                    subMenu: [
                        {
                            type: "checkbox",
                            label: "test - cb",
                            checked: false
                        },
                        {
                            type: "checkbox",
                            label: "test - cb 1",
                            checked: true
                        }
                    ]
                },
                {
                    type: "normal",
                    label: "test 4",
                    subMenu: [
                        {
                            type: "normal",
                            label: "test 1",
                            icon: ClientIcon.IsTalker
                        },
                        {
                            type: "normal",
                            label: "test 2",
                            icon: ClientIcon.ServerGreen
                        },
                        {
                            type: "separator"
                        },
                        {
                            type: "normal",
                            label: "test 3"
                        },
                        {
                            type: "normal",
                            label: "test 4",
                            subMenu: [
                                {
                                    type: "normal",
                                    label: "test 1",
                                    icon: ClientIcon.IsTalker
                                },
                                {
                                    type: "normal",
                                    label: "test 2",
                                    icon: ClientIcon.ServerGreen
                                },
                                {
                                    type: "separator"
                                },
                                {
                                    type: "normal",
                                    label: "test 3"
                                },
                                {
                                    type: "normal",
                                    label: "test 4"
                                }
                            ]
                        }
                    ]
                }
            ]);
        }, 1000);
         */
    }
})
