import {RawSourceMap} from "source-map";
import * as webpack from "webpack";
import * as loaderUtils from "loader-utils";

import LoaderContext = webpack.loader.LoaderContext;

export default function loader(this: LoaderContext, source: string | Buffer, sourceMap?: RawSourceMap): string | Buffer | void | undefined {
    this.cacheable();

    const options = loaderUtils.getOptions(this);
    if(!options.enabled) {
        this.callback(null, source);
        return;
    }

    const start_regex = "devel-block\\((?<name>\\S+)\\)";
    const end_regex = "devel-block-end";

    const pattern = new RegExp("[\\t ]*\\/\\* ?" + start_regex + " ?\\*\\/[\\s\\S]*?\\/\\* ?" + end_regex + " ?\\*\\/[\\t ]*\\n?", "g");
    source = (source as string).replace(pattern, (value, type) => {
        return "/* snipped block \"" + type + "\" */";
    });
    this.callback(null, source);
}