//Source: https://www.movable-type.co.uk/scripts/sha1.html

namespace sha {
    export function sha1(message: string | ArrayBuffer) : PromiseLike<ArrayBuffer> {
        let buffer = message instanceof ArrayBuffer ? message : new TextEncoder("utf-8").encode(message);
        return crypto.subtle.digest("SHA-1", buffer);
    }

}