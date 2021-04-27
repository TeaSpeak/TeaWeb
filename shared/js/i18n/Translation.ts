import {LogCategory, logError} from "tc-shared/log";

export abstract class AbstractTranslationResolver {
    private translationCache: { [key: string]: string };

    protected constructor() {
        this.translationCache = {};
    }

    /**
     * Translate the target message.
     * @param message
     */
    public translateMessage(message: string) {
        /* typeof is the fastest method */
        if(typeof this.translationCache === "string") {
            return this.translationCache[message];
        }

        let result;
        try {
            result = this.translationCache[message] = this.resolveTranslation(message);
        } catch (error) {
            /* Don't translate this message because it could cause an infinite loop */
            logError(LogCategory.I18N, "Failed to resolve translation message: %o", error);
            result = this.translationCache[message] = message;
        }

        return result;
    }

    protected invalidateCache() {
        this.translationCache = {};
    }

    /**
     * Register a translation into the cache.
     * @param message
     * @param translation
     * @protected
     */
    protected registerTranslation(message: string, translation: string) {
        this.translationCache[message] = translation;
    }

    protected abstract resolveTranslation(message: string) : string;
}