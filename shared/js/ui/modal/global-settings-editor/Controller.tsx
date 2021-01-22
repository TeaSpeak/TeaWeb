import {spawnModal} from "tc-shared/ui/react-elements/Modal";
import {Registry} from "tc-shared/events";
import {ModalGlobalSettingsEditorEvents, Setting} from "tc-shared/ui/modal/global-settings-editor/Definitions";
import {RegistryKey, RegistryValueType, Settings, settings} from "tc-shared/settings";

export function spawnGlobalSettingsEditor() {
    const events = new Registry<ModalGlobalSettingsEditorEvents>();
    initializeController(events);

    const modal = spawnModal("global-settings-editor", [ events.generateIpcDescription() ], { popoutable: true, popedOut: false });
    modal.show();
    modal.getEvents().on("destroy", () => {
        events.fire("notify_destroy");
        events.destroy();
    });
}

function initializeController(events: Registry<ModalGlobalSettingsEditorEvents>) {
    events.on("query_settings", () => {
        const settingsList: Setting[] = [];

        for(const key of Settings.KEYS) {
            const setting = Settings[key] as RegistryKey<RegistryValueType>;
            settingsList.push({
                key: setting.key,
                description: setting.description,
                type: setting.valueType,
                defaultValue: "defaultValue" in setting ? (setting as any).defaultValue : undefined
            });
        }

        events.fire_react("notify_settings", { settings: settingsList });
    });

    events.on("action_select_setting", event => {
        events.fire("notify_selected_setting", { setting: event.setting });
    });

    events.on("query_setting", event => {
        const setting = Settings.KEYS.map(setting => Settings[setting] as RegistryKey<RegistryValueType>).find(e => e.key === event.setting);
        if(typeof setting === "undefined") {
            events.fire("notify_setting", {
                setting: event.setting,
                status: "not-found"
            });
            return;
        }

        events.fire("notify_setting", {
            setting: event.setting,
            status: "success",
            info: {
                key: setting.key,
                description: setting.description,
                type: setting.valueType,
                defaultValue: "defaultValue" in setting ? (setting as any).defaultValue : undefined
            },
            value: settings.getValue(setting, undefined)
        });
    });

    events.on("action_set_value", event => {
        const setting = Settings.KEYS.map(setting => Settings[setting] as RegistryKey<RegistryValueType>).find(e => e.key === event.setting);
        if(typeof setting === "undefined") {
            return;
        }

        /* the change will may already trigger a notify_setting_value, but just to ensure we're fiering it later as well */
        settings.setValue(setting, event.value);

        events.fire_react("notify_setting_value", { setting: event.setting, value: event.value });
    });

    events.on("notify_destroy", settings.events.on("notify_setting_changed", event => {
        if(event.mode === "global") {
            events.fire_react("notify_setting_value", { setting: event.setting, value: event.newValue });
        }
    }));
}