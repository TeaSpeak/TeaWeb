import {extractJsRendererTranslations} from "./JsRendererGenerator";
import {deltaTranslations} from "./TsTransformer";

export default function (source) {
    const options = this.getOptions({
        translations: { type: "array" }
    });
    source = typeof source === "object" ? source.toString() : source;

    const timestampBegin = Date.now();
    const translations = extractJsRendererTranslations({
        name: this.resourcePath,
        content: source
    });
    const timestampEnd = Date.now();

    deltaTranslations(options.translations, this.resourcePath, timestampEnd - timestampBegin, translations);
    return source;
};