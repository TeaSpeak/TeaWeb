class BufferChunk {
    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }
    copyRangeTo(target, maxLength, offset) {
        let copy = Math.min(this.buffer.length - this.index, maxLength);
        for (let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
            target.getChannelData(channel).set(this.buffer.getChannelData(channel).subarray(this.index, this.index + copy), offset);
        }
        return copy;
    }
}
class CodecClientCache {
    constructor() {
        this._chunks = [];
    }
    bufferedSamples(max = 0) {
        let value = 0;
        for (let i = 0; i < this._chunks.length && value < max; i++)
            value += this._chunks[i].buffer.length - this._chunks[i].index;
        return value;
    }
}
//# sourceMappingURL=Codec.js.map