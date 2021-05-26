import {MenuBarDriver, MenuBarEntry} from "tc-shared/ui/frames/menu-bar";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {MenuBarRenderer} from "./Renderer";

const cssStyle = require("./Renderer.scss");

let uniqueMenuEntryId = 0;
export class WebMenuBarDriver implements MenuBarDriver {
    private readonly htmlContainer: HTMLDivElement;
    private currentEntries: MenuBarEntry[] = [];

    constructor() {
        this.htmlContainer = document.createElement("div");
        this.htmlContainer.classList.add(cssStyle.container);
        document.body.append(this.htmlContainer);
    }

    clearEntries() {
        this.currentEntries = [];
        this.renderMenu();
    }

    setEntries(entries: MenuBarEntry[]) {
        if(this.currentEntries === entries) { return; }
        this.currentEntries = entries.slice(0);
        this.currentEntries.forEach(WebMenuBarDriver.fixupUniqueIds);
        this.renderMenu();
    }

    private static fixupUniqueIds(entry: MenuBarEntry) {
        if(!entry.uniqueId) {
            entry.uniqueId = "item-" + (++uniqueMenuEntryId);
        }
        if(entry.type === "normal") {
            entry.children?.forEach(WebMenuBarDriver.fixupUniqueIds);
        }
    }

    private renderMenu() {
        ReactDOM.render(React.createElement(MenuBarRenderer, { items: this.currentEntries }), this.htmlContainer);
    }
}