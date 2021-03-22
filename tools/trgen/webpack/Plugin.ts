import * as ts from "typescript";
import * as webpack from "webpack";
import * as path from "path";
import {transform} from "../generator/TypeScript";
import {deltaTranslations} from "./Utils";
import {TranslationEntry} from "../Definitions";

export interface TranslateableWebpackPluginConfig {
    assetName: string,
}

export default class TranslateableWebpackPlugin {
    private readonly config: TranslateableWebpackPluginConfig;
    private readonly translations: TranslationEntry[];

    constructor(config: TranslateableWebpackPluginConfig) {
        this.config = config;
        this.translations = [];
    }

    createTypeScriptTransformer(program: ts.Program) : ts.TransformerFactory<ts.SourceFile> {
        return ctx => sourceFile => {
            const timestampBegin = Date.now();
            const result = transform({
                module: true,
                useWindow: false,
                /*
                 * Note: Even though caching might cause less method calls but if the tr method is performant developed
                 *       it's faster than having the cache lookup.
                 */
                cacheTranslations: false,
                optimized: true,
            }, ctx, sourceFile);
            const timestampEnd = Date.now();

            deltaTranslations(this.translations, sourceFile.fileName, timestampEnd - timestampBegin, result.translations);
            return result.node;
        };
    }

    createTemplateLoader() {
        return {
            loader: path.join(__dirname, "Loader.js"),
            options: {
                translations: this.translations
            }
        };
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.emit.tap("TranslateableWebpackPlugin", compilation => {
            const payload = JSON.stringify(this.translations);
            compilation.assets[this.config.assetName] = {
                size() { return payload.length; },
                source() { return payload; }
            } as any;
        });

        /*
        compiler.hooks.normalModuleFactory.tap("TranslateableWebpackPlugin", normalModuleFactory => {
            normalModuleFactory.hooks.resolve.tap("TranslateableWebpackPlugin", resolveData => {
                if(resolveData.request === "generated-translations") {
                }
            });
        });
        */
    }
}