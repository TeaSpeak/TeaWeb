export interface TranslationEntry {
    filename: string;
    line: number;
    character: number;

    message: string;

    type: "call" | "jsx-translatable" | "jsx-variadic-translatable" | "js-template";
}