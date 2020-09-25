import * as path from "path";
import * as fs from "fs-extra";
import {TranslationServiceClient} from "@google-cloud/translate";

const translation_project_id = "luminous-shadow-92008";
const translation_location = "global";
const translation_client = new TranslationServiceClient();

const kExposedToUIFlag = "ui-visible";
const UserUITags = [
    "jsx-translatable",
    "jsx-variadic-translatable",
    "js-template"
]

const kFlagInUseSystem = "in-use-system";
const kFlagInUseManual = "in-use-manual";

async function run_translate(messages: string[], source_language: string, target_language: string) : Promise<(string | undefined)[]> {
    let messages_left = messages.slice(0);
    let result = [];

    while (messages_left.length > 0) {
        const chunk_size = Math.min(messages_left.length, 128);
        const chunk = messages_left.slice(0, chunk_size);

        console.log("Translated %d/%d. Messages left: %d. Chunk size: %d", messages.length - messages_left.length, messages.length, messages_left.length, chunk_size);
        try {
            const [response] = await translation_client.translateText({
                parent: `projects/${translation_project_id}/locations/${translation_location}`,
                contents: chunk,
                mimeType: "text/plain",
                sourceLanguageCode: source_language,
                targetLanguageCode: target_language
            });

            result.push(...response.translations.map(e => e.translatedText));
        } catch (error) {
            console.log(error);
            console.log("Failed to execute translation request: %o", 'details' in error ? error.details : error instanceof Error ? error.message : error);
            throw "translated failed";
        }

        messages_left = messages_left.slice(chunk_size);
    }
    return result;
}

interface TranslationEntry {
    translated: string,
    flags: string[],
    key: {
        message: string
    }
}

interface TranslationFile {
    info: {
        name: string,
        contributors: {
            name: string,
            email: string
        }[]
    },
    translations: TranslationEntry[]
}

interface InputFile {
    message: string;
    line: number;
    character: number;
    filename: string;
    type: string;
}

function updateUIFlag(entry: TranslationEntry, type: string) {
    const uiVisible = UserUITags.indexOf(type) !== -1;
    if(uiVisible) {
        if(entry.flags.indexOf(kExposedToUIFlag) === -1) {
            entry.flags.push(kExposedToUIFlag);
        }
    } else {
        const index = entry.flags.indexOf(kExposedToUIFlag);
        if(index !== -1) {
            entry.flags.splice(index, 1);
        }
    }
}

async function translate_messages(input_files: string[], output_file: string, source_language: string, target_language: string, noTranslate: boolean) {
    let output_data: TranslationFile;
    if(await fs.pathExists(output_file)) {
        try {
            output_data = await fs.readJSON(output_file);
        } catch (error) {
            console.log("Failed to parse output data: %o", error);
            throw "failed to read output file";
        }
    } else {
        output_data = {} as any;
    }

    if(!output_data.info) {
        output_data.info = {
            contributors: [
                {
                    "name": "Google Translate, via script by Markus Hadenfeldt",
                    "email": "gtr.i18n.client@teaspeak.de"
                }
            ],
            name: "Auto translated messages for language " + target_language
        }
    }

    if(!Array.isArray(output_data.translations)) {
        output_data.translations = [];
    }

    let known_messages: InputFile[] = [];
    for(const file of input_files) {
        try {
            const messages = await fs.readJSON(file);
            known_messages.push(...messages);
        } catch (error) {
            console.log("Failed to parse input file %o", error);
            throw "failed to read input file";
        }
    }

    /* TODO: Check in the unused translations if that phrase has already been translated */
    const original_messages = known_messages.length;
    const messages_to_translate = known_messages.filter(e => {
        const entry = output_data.translations.find(f => e.message === f.key.message);
        if(!entry) {
            /* needs translation */
            return true;
        }

        /* update ui status */
        updateUIFlag(entry, e.type);
    });

    if(noTranslate) {
        console.log("Messages %d out of %d have been translated", messages_to_translate.length, original_messages);
    } else {
        console.log("Messages to translate: %d out of %d", messages_to_translate.length, original_messages);
        const response = await run_translate(messages_to_translate.map(e => e.message), source_language, target_language);
        if(messages_to_translate.length !== response.length)
            throw "invalid response length";

        for(let index = 0; index < response.length; index++) {
            if(typeof response[index] !== "string") {
                console.log("Failed to translate message %s", messages_to_translate[index]);
                continue;
            }

            let translated = {
                key: {
                    message: messages_to_translate[index].message
                },
                translated: response[index],
                flags: [
                    "google-translated"
                ]
            } as TranslationEntry;
            updateUIFlag(translated, messages_to_translate[index].type);
            output_data.translations.push(translated);
        }
    }

    output_data.translations.filter(translation => {
        const inUse = known_messages.findIndex(message => message.message === translation.key.message) !== -1;
        if(inUse) {
            if(translation.flags.indexOf(kFlagInUseSystem) === -1) {
                translation.flags.push(kFlagInUseSystem);
            }
        } else {
            const index = translation.flags.indexOf(kFlagInUseSystem);
            if(index !== -1) {
                translation.flags.splice(index, 1);
            }
        }
    });

    await fs.writeJSON(output_file, output_data, {
        spaces: "  "
    });
}

const process_args = process.argv.slice(2);
if(process_args.length < 1) {
    console.error("Invalid argument count");
    console.error("Usage: ./generate_i18n_gtranslate.py <language> [<target file>]");
    process.exit(1);
}

const input_files = ["../dist/translations.json", "generated/translations_html.json"].map(e => path.join(__dirname, e));
const output_file = process_args[1] || path.join(__dirname, "i18n", process_args[0] + "_google_translate.translation");

(async () => {
    await translate_messages(input_files, output_file, "en", process_args[0], process_args[0] === "none");
})().catch(error => {
    console.error("Failed to create translation files: %o", error);
    process.exit(1);
}).then(() => {
    console.log("Translation files have been updated.");
    process.exit(0);
});