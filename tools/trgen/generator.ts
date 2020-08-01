export interface TranslationEntry {
    filename: string;
    line: number;
    character: number;

    message: string;

    type: "call" | "jsx-translatable" | "js-template";
}