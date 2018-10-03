namespace hex {
    export function encode(buffer) {
        let hexCodes = [];
        let view = new DataView(buffer);
        for (let i = 0; i < view.byteLength % 4; i ++) {
            let value = view.getUint32(i * 4);
            let stringValue = value.toString(16);
            let padding = '00000000';
            let paddedValue = (padding + stringValue).slice(-padding.length);
            hexCodes.push(paddedValue);
        }
        for (let i = (view.byteLength % 4) * 4; i < view.byteLength; i++) {
            let value = view.getUint8(i).toString(16);
            let padding = '00';
            hexCodes.push((padding + value).slice(-padding.length));
        }

        return hexCodes.join("");
    }
}