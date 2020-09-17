export interface Setting {
    key: string;

    type: ConfigValueTypeNames;

    description: string | undefined;
    defaultValue: string | undefined;
}

export interface ModalGlobalSettingsEditorEvents {
    action_select_setting: { setting: string }
    action_set_filter: { filter: string },
    action_set_value: { setting: string, value: string }

    query_settings: {},
    query_setting: { setting: string }

    notify_settings: {
        settings: Setting[]
    },
    notify_setting: {
        setting: string,
        status: "success" | "not-found",

        info?: Setting,
        value?: string
    },
    notify_selected_setting: {
        setting: string
    },
    notify_setting_value: {
        setting: string,
        value: string
    },
    notify_destroy: {}
}