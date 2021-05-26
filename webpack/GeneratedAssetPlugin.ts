import * as webpack from "webpack";
import {Compilation} from "webpack";

export interface GeneratedAsset {
    assetName: string,
    content: string | (() => string)
}

export interface GeneratedAssetPluginConfig {
    customFiles: GeneratedAsset[]
}

export class GeneratedAssetPlugin {
    readonly options: GeneratedAssetPluginConfig;

    constructor(options: GeneratedAssetPluginConfig) {
        this.options = options;
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap({
            name: "GeneratedAssetPlugin",
            stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        }, compilation => {
            compilation.hooks.processAssets.tap("GeneratedAssetPlugin", () => {
                for(const asset of this.options.customFiles) {
                    let content: string;
                    if(typeof asset.content === "string") {
                        content = asset.content;
                    } else {
                        content = asset.content();
                    }

                    compilation.emitAsset(asset.assetName, new webpack.sources.RawSource(content), {
                        immutable: true,
                        hotModuleReplacement: true,
                        size: content.length
                    });
                }
            });
        });
    }
}