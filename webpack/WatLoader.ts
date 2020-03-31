import * as webpack from "webpack";
import {RawSourceMap} from "source-map";
import LoaderContext = webpack.loader.LoaderContext;

const wabt = require("wabt");

const filename = "module.wast";

export default function loader(this: LoaderContext, source: string | Buffer, sourceMap?: RawSourceMap): string | Buffer | void | undefined {
    this.cacheable();

    const module = wabt.parseWat(filename, source);
    const { buffer } = module.toBinary({ write_debug_names: true, relocatable: true, canonicalize_lebs: true, log: true });

    this.emitFile("test.wasm", buffer, null);
    const result = `module.exports = new Uint8Array([${buffer.join(",")}]);`;
    this.callback(null, result);
}