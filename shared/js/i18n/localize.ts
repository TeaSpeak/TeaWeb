namespace i18n {
    export function tr(message: string, key?: string) {
        console.log("Translating \"%s\". Default: \"%s\"", key, message);

        return message;
    }
}
const tr: typeof i18n.tr = i18n.tr;