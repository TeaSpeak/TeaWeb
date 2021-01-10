import * as sha1 from "../crypto/sha";
import {LogCategory, logDebug} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";

export function hashPassword(password: string) : Promise<string> {
    return new Promise<string>((resolve, reject) => {
        sha1.sha1(password).then(result => {
            resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(result))));
        });
    });
}

export const copyToClipboard = str => {
    logDebug(LogCategory.GENERAL, tr("Copy text to clipboard: %s"), str);

    const element = document.createElement('textarea');
    element.value = str;
    element.setAttribute('readonly', '');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);

    const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;

    element.select();
    document.execCommand('copy');

    document.body.removeChild(element);
    if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
    }
};