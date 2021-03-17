import * as ts from "typescript";
import {createTransformer, TransformerConfig} from "./TsTransformer";
import * as webpack from "webpack";
import * as path from "path";

export interface TranslateableWebpackPluginConfig {
    assetName: string,
}

export default class TranslateableWebpackPlugin {
    private readonly config: TranslateableWebpackPluginConfig;
    private readonly transformerConfig: TransformerConfig;

    constructor(config: TranslateableWebpackPluginConfig) {
        this.config = config;
        this.transformerConfig = {
            optimized: true,
            translations: [],
            verbose: true
        };
    }

    createTypeScriptTransformer(program: ts.Program) : ts.TransformerFactory<ts.Node> {
        return createTransformer(program, this.transformerConfig);
    }

    createTemplateLoader() {
        return {
            loader: path.join(__dirname, "JsRendererTranslationLoader.js"),
            options: {
                translations: this.transformerConfig.translations
            }
        };
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.emit.tap("TranslateableWebpackPlugin", compilation => {
            const payload = JSON.stringify(this.transformerConfig.translations);
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