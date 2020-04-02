export function str2ab8(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/* FIXME Dont use atob, because it sucks for non UTF-8 tings */
export function arrayBufferBase64(base64: string) {
    base64 = atob(base64);
    const buf = new ArrayBuffer(base64.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = base64.length; i < strLen; i++) {
        bufView[i] = base64.charCodeAt(i);
    }
    return buf;
}

export function base64_encode_ab(source: ArrayBufferLike) {
    const encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64      = "";

    const bytes          = new Uint8Array(source);
    const byte_length    = bytes.byteLength;
    const byte_reminder  = byte_length % 3;
    const main_length    = byte_length - byte_reminder;

    let a, b, c, d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < main_length; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) <<  6
        d = (chunk & 63)       >>  0; // 63       = (2^6 - 1) <<  0

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byte_reminder == 1) {
        chunk = bytes[main_length];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3)   << 4; // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '==';
    } else if (byte_reminder == 2) {
        chunk = (bytes[main_length] << 8) | bytes[main_length + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) <<  4

        // Set the 2 least significant bits to zero
        c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64
}