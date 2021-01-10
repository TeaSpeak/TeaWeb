import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {CssEditorEvents, CssVariable} from "../../../ui/modal/css-editor/Definitions";
import {spawnExternalModal} from "../../../ui/react-elements/external-modal";
import {Registry} from "../../../events";
import {LogCategory, logWarn} from "../../../log";
import {tr} from "tc-shared/i18n/localize";

interface CustomVariable {
    name: string;
    value: string;
    enabled: boolean;
}

class CssVariableManager {
    private customVariables: { [key: string]: CustomVariable } = {};
    private htmlTag: HTMLStyleElement;

    private loadLocalStorage() {
        try {
            const payloadString = localStorage.getItem("css-custom-variables");
            if (typeof payloadString === "undefined" || !payloadString)
                return;

            const payload = JSON.parse(payloadString);
            if (payload.version !== 1)
                throw "invalid payload version";

            this.customVariables = payload["customVariables"];
        } catch (error) {
            logWarn(LogCategory.GENERAL, tr("Failed to load custom variables: %o"), error);
        }
    }

    initialize() {
        this.htmlTag = document.createElement("style");
        document.body.appendChild(this.htmlTag);

        this.loadLocalStorage();
        this.updateCustomVariables(false);
    }

    getAllCssVariables(): CssVariable[] {
        let variables: { [key: string]: CssVariable } = {};

        const ownStyleSheets = Array.from(document.styleSheets)
            .filter(sheet => sheet.href === null || sheet.href.startsWith(window.location.origin)) as CSSStyleSheet[];
        for (const sheet of ownStyleSheets) {
            for (const rule of sheet.cssRules) {
                if (!(rule instanceof CSSStyleRule))
                    continue;

                if (rule.selectorText !== "html:root" && rule.selectorText !== ":root")
                    continue;

                for (const entry of rule.style) {
                    if (!entry.startsWith("--"))
                        continue;

                    if (variables[entry])
                        continue;

                    const customVariable = this.customVariables[entry];
                    variables[entry] = {
                        name: entry,
                        defaultValue: rule.style.getPropertyValue(entry).trim(),
                        customValue: customVariable?.value,
                        overwriteValue: !!customVariable?.enabled
                    };
                }
            }
        }

        return Object.values(variables);
    }

    setVariable(name: string, value: string) {
        const customVariable = this.customVariables[name] || (this.customVariables[name] = {
            name: name,
            value: undefined,
            enabled: false
        });
        customVariable.enabled = true;
        customVariable.value = value;
        this.updateCustomVariables(true);
    }

    toggleCustomVariable(name: string, flag: boolean, value?: string) {
        let customVariable = this.customVariables[name];
        if (!customVariable) {
            if (!flag)
                return;

            customVariable = this.customVariables[name] = {name: name, value: value, enabled: true};
        }

        customVariable.enabled = flag;
        if (flag && typeof value === "string")
            customVariable.value = value;
        this.updateCustomVariables(true);
    }

    exportConfig(allValues: boolean) {
        if (allValues) {
            return JSON.stringify({
                version: 1,
                variables: this.getAllCssVariables().map<CustomVariable>(variable => {
                    if (this.customVariables[variable.name]) {
                        return this.customVariables[variable.name];
                    }

                    return {
                        name: variable.name,
                        enabled: typeof variable.customValue !== "undefined",
                        value: typeof variable.customValue === "undefined" ? variable.defaultValue : variable.customValue
                    }
                })
            });
        } else {
            return JSON.stringify({
                version: 1,
                variables: this.customVariables
            });
        }
    }

    importConfig(config: string) {
        const data = JSON.parse(config);
        if (data.version !== 1)
            throw "unsupported config version";

        this.customVariables = data.variables;
        this.updateCustomVariables(true);
    }

    reset() {
        this.customVariables = {};
        this.updateCustomVariables(true);
    }

    randomize() {
        this.customVariables = {};
        this.getAllCssVariables().forEach(e => {
            this.customVariables[e.name] = {
                enabled: true,
                value: "#" + Math.floor(Math.random() * 0xFFFFFF).toString(16),
                name: e.name
            }
        });
        this.updateCustomVariables(true);
    }

    private updateCustomVariables(updateConfig: boolean) {
        let text = "html:root {\n";
        for (const variable of Object.values(this.customVariables))
            text += "    " + variable.name + ": " + variable.value + ";\n";
        text += "}";
        this.htmlTag.textContent = text;

        if (updateConfig) {
            localStorage.setItem("css-custom-variables", JSON.stringify({
                version: 1,
                customVariables: this.customVariables
            }));
        }
    }
}

let cssVariableManager: CssVariableManager;

export function spawnModalCssVariableEditor() {
    const events = new Registry<CssEditorEvents>();
    cssVariableEditorController(events);

    const modal = spawnExternalModal("css-editor", { default: events }, {});
    modal.show();
}

function cssVariableEditorController(events: Registry<CssEditorEvents>) {
    events.on("query_css_variables", () => {
        events.fire_react("notify_css_variables", {
            variables: cssVariableManager.getAllCssVariables()
        })
    });

    events.on("action_override_toggle", event => {
        cssVariableManager.toggleCustomVariable(event.variableName, event.enabled, event.value);
    });

    events.on("action_change_override_value", event => {
        cssVariableManager.setVariable(event.variableName, event.value);
    });

    events.on("action_export", event => {
        events.fire_react("notify_export_result", {
            config: cssVariableManager.exportConfig(event.allValues)
        });
    });

    events.on("action_import", event => {
        try {
            cssVariableManager.importConfig(event.config);
            events.fire_react("notify_import_result", {success: true});
            events.fire_react("action_select_entry", {variable: undefined});
            events.fire_react("query_css_variables");
        } catch (error) {
            logWarn(LogCategory.GENERAL, "Failed to import CSS variable values: %o", error);
            events.fire_react("notify_import_result", {success: false});
        }
    });

    events.on("action_reset", () => {
        cssVariableManager.reset();
        events.fire_react("action_select_entry", {variable: undefined});
        events.fire_react("query_css_variables");
    });

    events.on("action_randomize", () => {
        cssVariableManager.randomize();
        events.fire_react("action_select_entry", {variable: undefined});
        events.fire_react("query_css_variables");
    });
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 10,
    name: "CSS Variable setup",
    function: async () => {
        cssVariableManager = new CssVariableManager();
        cssVariableManager.initialize();
    }
});