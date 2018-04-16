/// <reference path="../crypto/sha.ts" />

namespace helpers {
    export function hashPassword(password: string) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            sha.sha1(password).then(result => {
                resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(result))));
            });
        });
    }
}