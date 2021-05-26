const wabt = require("wabt")();
const filename = "module.wast";

export default function loader(source: string | Buffer): string | Buffer | void | undefined {
    this.cacheable();

    const module = wabt.parseWat(filename, source);
    const { buffer } = module.toBinary({ write_debug_names: false });

    this.callback(null, `module.exports = new Uint8Array([${buffer.join(",")}]);`);
}