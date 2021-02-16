function toCodePoint(unicodeSurrogates) {
    let r = [],
        c = 0,
        p = 0,
        i = 0;
    while (i < unicodeSurrogates.length) {
        c = unicodeSurrogates.charCodeAt(i++);
        if (p) {
            r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
            p = 0;
        } else if (0xD800 <= c && c <= 0xDBFF) {
            p = c;
        } else {
            r.push(c.toString(16));
        }
    }
    return r.join("-");
}

const U200D = String.fromCharCode(0x200D);
const UFE0Fg = /\uFE0F/g;
export function getTwenmojiHashFromNativeEmoji(emoji: string) : string {
    // if variant is present as \uFE0F
    return toCodePoint(emoji.indexOf(U200D) < 0 ?
        emoji.replace(UFE0Fg, '') :
        emoji
    );
}