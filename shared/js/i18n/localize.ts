/*
"key": {
    "message": "Show permission description",
    "line": 374,
    "character": 30,
    "filename": "/home/wolverindev/TeaSpeak/TeaSpeak/Web-Client/shared/js/ui/modal/ModalPermissionEdit.ts"
},
"translated": "Berechtigungsbeschreibung anzeigen",
"flags": [
    "google-translate",
    "verified"
]
 */
namespace i18n {
    interface TranslationKey {
        message: string;
        line?: number;
        character?: number;
        filename?: string;
    }

    interface Translation {
        key: TranslationKey;
        translated: string;
        flags?: string[];
    }

    interface Contributor {
        name: string;
        email: string;
    }

    interface FileInfo {
        name: string;
        contributors: Contributor[];
    }

    interface TranslationFile {
        info: FileInfo;
        translations: Translation[];
    }

    let translations: Translation[] = [];
    let fast_translate: { [key:string]:string; } = {};
    export function tr(message: string, key?: string) {
        const sloppy = fast_translate[message];
        if(sloppy) return sloppy;

        console.log("Translating \"%s\". Default: \"%s\"", key, message);

        let translated = message;
        for(const translation of translations) {
            if(translation.key.message == message) {
                translated = translation.translated;
                break;
            }
        }

        fast_translate[message] = translated;
        return translated;
    }

    export function load_file(url: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            $.ajax({
                url: url,
                async: true,
                success: result => {
                    console.dir(result);
                    const file = (typeof(result) === "string" ? JSON.parse(result) : result) as TranslationFile;
                    if(!file) {
                        reject("Invalid json");
                        return;
                    }

                    //TODO validate file
                    translations = file.translations;
                    log.info(LogCategory.I18N, tr("Successfully initialized up translation file from %s"), url);
                    resolve();
                },
                error: (xhr, error) => {
                    log.warn(LogCategory.I18N, "Failed to load translation file from \"%s\". Error: %o", url, error);
                    reject("Failed to load file: " + error);
                }
            })
        });
    }

    export async function initialize() {
       // await load_file("http://localhost/home/TeaSpeak/TeaSpeak/Web-Client/web/environment/development/i18n/de_DE.translation");
        await load_file("http://localhost/home/TeaSpeak/TeaSpeak/Web-Client/web/environment/development/i18n/test.json");
    }
}

const tr: typeof i18n.tr = i18n.tr;

/*
{
    "info": {
        "contributors": [
            {
                "name": "Markus Hadenfeldt",
                "email": "i18n.client@teaspeak.de"
            }
        ],
        "name": "German translations"
    },
    "translations": [
        {
            "key": {
                "message": "Show permission description",
                "line": 374,
                "character": 30,
                "filename": "/home/wolverindev/TeaSpeak/TeaSpeak/Web-Client/shared/js/ui/modal/ModalPermissionEdit.ts"
            },
            "translated": "Berechtigungsbeschreibung anzeigen",
            "flags": [
                "google-translate",
                "verified"
            ]
        }
    ]
}
 */