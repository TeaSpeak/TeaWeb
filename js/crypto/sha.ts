//Source: https://www.movable-type.co.uk/scripts/sha1.html

/*
declare class TextEncoder {
    encode(msg) : ArrayBuffer;
}
*/
namespace sha {
    export function sha1(message: string | ArrayBuffer) : PromiseLike<ArrayBuffer> {
        let buffer = message instanceof ArrayBuffer ? message : new TextEncoder().encode(message);
        return crypto.subtle.digest("SHA-1", buffer);
    }

}