import {TranslationEntry} from "./generator";

export interface Configuration {

}
export interface File {
    content: string;
    name: string;
}

/* Well my IDE hates me and does not support groups. By default with ES6 groups are supported... nvm */
//const regex = /{{ *tr *(?<message_expression>(("([^"]|\\")*")|('([^']|\\')*')|(`([^`]|\\`)+`)|( *\+ *)?)+) *\/ *}}/;
const regex = /{{ *tr *((("([^"]|\\")*")|('([^']|\\')*')|(`([^`]|\\`)+`)|([\n ]*\+[\n ]*)?)+) *\/ *}}/;
export function generate(config: Configuration, file: File) : TranslationEntry[] {
    let result: TranslationEntry[] = [];

    const lines = file.content.split('\n');
    let match: RegExpExecArray;
    let base_index = 0;

    while(match = regex.exec(file.content.substr(base_index))) {
        let expression = ((<any>match).groups || {})["message_expression"] || match[1];
        //expression = expression.replace(/\n/g, "\\n");

        let message;
        try {
            message = eval(expression);
        } catch (error) {
            console.error("Failed to evaluate expression:\n%s", expression);
            base_index += match.index + match[0].length;
            continue;
        }

        let character = base_index + match.index;
        let line;

        for(line = 0; line < lines.length; line++) {
            const length = lines[line].length + 1;
            if(length > character) break;
            character -= length;
        }

        result.push({
            filename: file.name,
            character: character + 1,
            line: line + 1,
            message: message
        });

        base_index += match.index + match[0].length;
    }
    return result;
}