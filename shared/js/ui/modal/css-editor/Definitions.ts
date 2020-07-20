export interface CssVariable {
    name: string;
    defaultValue: string;
    overwriteValue: boolean;

    customValue?: string;
}

export interface CssEditorUserData {

}

export interface CssEditorEvents {
    action_set_filter: { filter: string | undefined },
    action_select_entry: { variable: CssVariable },
    action_override_toggle: { variableName: string, enabled: boolean, value?: string }
    action_change_override_value: { variableName: string, value: string },
    action_reset: { },
    action_randomize: {},

    action_export: {},
    action_import: { config: string }

    query_css_variables: {},
    notify_css_variables: { variables: CssVariable[] }

    notify_export_result: { config: string },
    notify_import_result: { success: boolean }
}