/// <reference path="../../declarations/imports_shared.d.ts"/>

namespace audio.codec  {
    export function new_instance(type: CodecType) : BasicCodec {
        return new CodecWrapperWorker(type);
    }
}