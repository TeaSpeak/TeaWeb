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
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

namespace i18n {
    export interface TranslationKey {
        message: string;
        line?: number;
        character?: number;
        filename?: string;
    }

    export interface Translation {
        key: TranslationKey;
        translated: string;
        flags?: string[];
    }

    export interface Contributor {
        name: string;
        email: string;
    }

    export interface TranslationFile {
        path: string;
        full_url: string;

        translations: Translation[];
    }

    export interface RepositoryTranslation {
        key: string;
        path: string;

        country_code: string;
        name: string;
        contributors: Contributor[];
    }
    
    export interface TranslationRepository {
        unique_id: string;
        url: string;
        name?: string;
        contact?: string;
        translations?: RepositoryTranslation[];
        load_timestamp?: number;
    }
    
    let translations: Translation[] = [];
    let fast_translate: { [key:string]:string; } = {};
    export function tr(message: string, key?: string) {
        const sloppy = fast_translate[message];
        if(sloppy) return sloppy;

        log.info(LogCategory.I18N, "Translating \"%s\". Default: \"%s\"", key, message);

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

    export function tra(message: string, ...args: any[]) {
        message = tr(message);
        return MessageHelper.formatMessage(message, ...args);
    }

    async function load_translation_file(url: string, path: string) : Promise<TranslationFile> {
        return new Promise<TranslationFile>((resolve, reject) => {
            $.ajax({
                url: url,
                async: true,
                success: result => {
                    try {
                        const file = (typeof(result) === "string" ? JSON.parse(result) : result) as TranslationFile;
                        if(!file) {
                            reject("Invalid json");
                            return;
                        }

                        file.full_url = url;
                        file.path = path;

                        //TODO: Validate file
                        resolve(file);
                    } catch(error) {
                        log.warn(LogCategory.I18N, tr("Failed to load translation file %s. Failed to parse or process json: %o"), url, error);
                        reject(tr("Failed to process or parse json!"));
                    }
                },
                error: (xhr, error) => {
                    reject(tr("Failed to load file: ") + error);
                }
            })
        });
    }

    export function load_file(url: string, path: string) : Promise<void> {
        return load_translation_file(url, path).then(async result => {
            /* TODO: Improve this test?!*/
            try {
                tr("Dummy translation test");
            } catch(error) {
                throw "dummy test failed";
            }

            log.info(LogCategory.I18N, tr("Successfully initialized up translation file from %s"), url);
            translations = result.translations;
        }).catch(error => {
            log.warn(LogCategory.I18N, tr("Failed to load translation file from \"%s\". Error: %o"), url, error);
            return Promise.reject(error);
        });
    }

    async function load_repository0(repo: TranslationRepository, reload: boolean) {
        if(!repo.load_timestamp || repo.load_timestamp < 1000 || reload) {
            const info_json = await new Promise((resolve, reject) => {
                $.ajax({
                    url: repo.url + "/info.json",
                    async: true,
                    cache: !reload,
                    success: result => {
                        const file = (typeof(result) === "string" ? JSON.parse(result) : result) as TranslationFile;
                        if(!file) {
                            reject("Invalid json");
                            return;
                        }

                        resolve(file);
                    },
                    error: (xhr, error) => {
                        reject(tr("Failed to load file: ") + error);
                    }
                })
            });

            Object.assign(repo, info_json);
        }

        if(!repo.unique_id)
            repo.unique_id = guid();

        repo.translations = repo.translations || [];
        repo.load_timestamp = Date.now();
    }

    export async function load_repository(url: string) : Promise<TranslationRepository> {
        const result = {} as TranslationRepository;
        result.url = url;
        await load_repository0(result, false);
        return result;
    }

    export namespace config {
        export interface TranslationConfig {
            current_repository_url?: string;
            current_language?: string;

            current_translation_url: string;
            current_translation_path: string;
        }

        export interface RepositoryConfig {
            repositories?: {
                url?: string;
                repository?: TranslationRepository;
            }[];
        }

        const repository_config_key = "i18n.repository";
        let _cached_repository_config: RepositoryConfig;
        export function repository_config() {
            if(_cached_repository_config)
                return _cached_repository_config;

            const config_string = localStorage.getItem(repository_config_key);
            const config: RepositoryConfig = config_string ? JSON.parse(config_string) : {};
            config.repositories = config.repositories || [];
            for(const repo of config.repositories)
                (repo.repository || {load_timestamp: 0}).load_timestamp = 0;

            if(config.repositories.length == 0) {
                //Add the default TeaSpeak repository
                load_repository(StaticSettings.instance.static("i18n.default_repository", "i18n/")).then(repo => {
                    log.info(LogCategory.I18N, tr("Successfully added default repository from \"%s\"."), repo.url);
                    register_repository(repo);
                }).catch(error => {
                    log.warn(LogCategory.I18N, tr("Failed to add default repository. Error: %o"), error);
                });
            }

            return _cached_repository_config = config;
        }

        export function save_repository_config() {
            localStorage.setItem(repository_config_key, JSON.stringify(_cached_repository_config));
        }

        const translation_config_key = "i18n.translation";
        let _cached_translation_config: TranslationConfig;

        export function translation_config() : TranslationConfig {
            if(_cached_translation_config)
                return _cached_translation_config;

            const config_string = localStorage.getItem(translation_config_key);
            _cached_translation_config = config_string ? JSON.parse(config_string) : {};
            return _cached_translation_config;
        }

        export function save_translation_config() {
            localStorage.setItem(translation_config_key, JSON.stringify(_cached_translation_config));
        }
    }

    export function register_repository(repository: TranslationRepository) {
        if(!repository) return;

        for(const repo of config.repository_config().repositories)
            if(repo.url == repository.url) return;

        config.repository_config().repositories.push(repository);
        config.save_repository_config();
    }
    
    export function registered_repositories() : TranslationRepository[] {
        return config.repository_config().repositories.map(e => e.repository || {url: e.url, load_timestamp: 0} as TranslationRepository);
    }
    
    export function delete_repository(repository: TranslationRepository) {
        if(!repository) return;

        for(const repo of [...config.repository_config().repositories])
            if(repo.url == repository.url) {
                config.repository_config().repositories.remove(repo);
            }
        config.save_repository_config();
    }

    export async function iterate_repositories(callback_entry: (repository: TranslationRepository) => any) {
        const promises = [];

        for(const repository of registered_repositories()) {
            promises.push(load_repository0(repository, false).then(() => callback_entry(repository)).catch(error => {
                log.warn(LogCategory.I18N, "Failed to fetch repository %s. error: %o", repository.url, error);
            }));
        }

        await Promise.all(promises);
    }

    export function select_translation(repository: TranslationRepository, entry: RepositoryTranslation) {
        const cfg = config.translation_config();

        if(entry && repository) {
            cfg.current_language = entry.name;
            cfg.current_repository_url = repository.url;
            cfg.current_translation_url = repository.url + entry.path;
            cfg.current_translation_path = entry.path;
        } else {
            cfg.current_language = undefined;
            cfg.current_repository_url = undefined;
            cfg.current_translation_url = undefined;
            cfg.current_translation_path = undefined;
        }

        config.save_translation_config();
    }

    export async function initialize() {
        const rcfg = config.repository_config(); /* initialize */
        const cfg = config.translation_config();

        if(cfg.current_translation_url) {
            try {
                await load_file(cfg.current_translation_url, cfg.current_translation_path);
            } catch (error) {
                console.error(tr("Failed to initialize selected translation: %o"), error);
                createErrorModal(tr("Translation System"), tr("Failed to load current selected translation file.") + "<br>File: " + cfg.current_translation_url + "<br>Error: " + error + "<br>" + tr("Using default fallback translations.")).open();
            }
        }
        // await load_file("http://localhost/home/TeaSpeak/TeaSpeak/Web-Client/web/environment/development/i18n/de_DE.translation");
        // await load_file("http://localhost/home/TeaSpeak/TeaSpeak/Web-Client/web/environment/development/i18n/test.json");
    }
}

// @ts-ignore
const tr: typeof i18n.tr = i18n.tr;
const tra: typeof i18n.tra = i18n.tra;

(window as any).tr = i18n.tr;
(window as any).tra = i18n.tra;