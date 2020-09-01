/*
 * This is more a hack than any thing else.
 * TypeScript can't keep the async import statements, but we require it to initialize the wasm object...
 */
module.exports = {
    getAudioLibraryInstance() {
        return import("../../../audio-lib/pkg/index_bg.wasm").then(wasm => {
            return import("../../../audio-lib/pkg/index").then(pkg => {
                return Object.assign(pkg, { memory: wasm.memory });
            });
        });
    }
};