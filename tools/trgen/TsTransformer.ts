import * as ts from "typescript";
import * as ts_generator from "./TsGenerator";
import {TranslationEntry} from "./generator";

export interface TransformerConfig {
    verbose: boolean;
    optimized: boolean;

    /**
     * Output array for all gathered translations.
     */
    translations?: TranslationEntry[];
}

export const deltaTranslations = (result: TranslationEntry[], fileName: string, processSpeed: number, newTranslations: TranslationEntry[]) => {
    let deletedTranslations = 0;
    for(let index = 0; index < result.length; index++) {
        if(result[index].filename === fileName) {
            result.splice(index, 1);
            index--;
            deletedTranslations++;
        }
    }

    result.push(...newTranslations);
    if(deletedTranslations === 0 && newTranslations.length === 0) {
        console.log("Processed %s (%dms). No translations found.", fileName, processSpeed);
    } else if(deletedTranslations === 0) {
        console.log("Processed %s (%dms). Found %d translations", fileName, processSpeed, newTranslations.length);
    } else if(newTranslations.length === 0) {
        console.log("Processed %s (%dms). %d translations deleted.", fileName, processSpeed, deletedTranslations);
    } else {
        console.log("Processed %s (%dms). Old translation count: %d New translation count: %d", fileName, processSpeed, deletedTranslations, newTranslations.length);
    }
}

export const createTransformer = (program: ts.Program, config: TransformerConfig) : ts.TransformerFactory<ts.SourceFile> => {
    return ctx => sourceFile => {
        const timestampBegin = Date.now();
        const result = ts_generator.transform({
            module: true,
            useWindow: false,
            /* Note: Even though caching might cause less method calls but if the tr method is performant developed it's faster than having the cache lookup */
            cacheTranslations: false,
            optimized: config.optimized,
        }, ctx, sourceFile);
        const timestampEnd = Date.now();

        deltaTranslations(config.translations || [], sourceFile.fileName, timestampEnd - timestampBegin, result.translations);
        return result.node;
    };
}