import * as sha1 from "../crypto/sha";

export function hashPassword(password: string) : Promise<string> {
    return new Promise<string>((resolve, reject) => {
        sha1.sha1(password).then(result => {
            resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(result))));
        });
    });
}

export const copy_to_clipboard = str => {
    console.log(tr("Copy text to clipboard: %s"), str);
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    const selected =
        document.getSelection().rangeCount > 0
            ? document.getSelection().getRangeAt(0)
            : false;
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
    }
};