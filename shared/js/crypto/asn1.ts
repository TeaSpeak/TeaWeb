// ASN.1 JavaScript decoder
// Copyright (c) 2008-2018 Lapo Luchini <lapo@lapo.it>
// Copyright (c) 2019-2019 Markus Hadenfeldt <git@teaspeak.de>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

namespace asn1 {
    declare class Int10 {
        constructor(value?: any);

        sub(sub: number);
        mulAdd(mul: number, add: number);
        simplify();
    }

    const ellipsis = "\u2026";

    function string_cut(str, len) {
        if (str.length > len)
            str = str.substring(0, len) + ellipsis;
        return str;
    }

    export class Stream {
        private static HEX_DIGITS = "0123456789ABCDEF";
        private static reTimeS = /^(\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
        private static reTimeL = /^(\d\d\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;

        position: number;
        data: string | ArrayBuffer;

        constructor(data: string | Stream | ArrayBuffer, position: number) {
            if (data instanceof Stream)
                this.data = data.data;
            else
                this.data = data;

            this.position = position;
        }

        length() : number {
            if (this.data instanceof ArrayBuffer)
                return this.data.byteLength;
            return this.data.length;
        }

        get(position?: number) {
            if (position === undefined)
                position = this.position++;

            if (position >= this.length())
                throw 'Requesting byte offset ' + this.position + ' on a stream of length ' + this.length();

            return (typeof(this.data) === "string") ? this.data.charCodeAt(position) : this.data[position];
        }

        hexByte(byte: number) {
            return Stream.HEX_DIGITS.charAt((byte >> 4) & 0xF) + Stream.HEX_DIGITS.charAt(byte & 0xF);
        }

        parseStringISO(start, end) {
            let s = "";
            for (let i = start; i < end; ++i)
                s += String.fromCharCode(this.get(i));
            return s;
        }

        parseStringUTF(start, end) {
            let s = "";
            for (let i = start; i < end;) {
                let c = this.get(i++);
                if (c < 128)
                    s += String.fromCharCode(c);
                else if ((c > 191) && (c < 224))
                    s += String.fromCharCode(((c & 0x1F) << 6) | (this.get(i++) & 0x3F));
                else
                    s += String.fromCharCode(((c & 0x0F) << 12) | ((this.get(i++) & 0x3F) << 6) | (this.get(i++) & 0x3F));
            }
            return s;
        }

        parseStringBMP(start, end) {
            let str = "", hi, lo;
            for (let i = start; i < end;) {
                hi = this.get(i++);
                lo = this.get(i++);
                str += String.fromCharCode((hi << 8) | lo);
            }
            return str;
        }

        parseTime(start, end, shortYear) {
            let s = this.parseStringISO(start, end),
                m = (shortYear ? Stream.reTimeS : Stream.reTimeL).exec(s);
            if (!m)
                return "Unrecognized time: " + s;
            if (shortYear) {
                // to avoid querying the timer, use the fixed range [1970, 2069]
                // it will conform with ITU X.400 [-10, +40] sliding window until 2030
                //m[1] = +m[1];
                //m[1] += (parseInt(m[1]) < 70) ? 2000 : 1900;
                throw "fixme!";
            }
            s = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4];
            if (m[5]) {
                s += ":" + m[5];
                if (m[6]) {
                    s += ":" + m[6];
                    if (m[7])
                        s += "." + m[7];
                }
            }
            if (m[8]) {
                s += " UTC";
                if (m[8] != 'Z') {
                    s += m[8];
                    if (m[9])
                        s += ":" + m[9];
                }
            }
            return s;
        };

        parseInteger(start, end) {
            let current: number = this.get(start);

            let negative = (current > 127);
            let padding = negative ? 255 : 0;
            let length;
            let descriptor: number | string;

            // skip unuseful bits (not allowed in DER)
            while (current == padding && ++start < end)
                current = this.get(start);

            length = end - start;
            if (length === 0)
                return negative ? '-1' : '0';

            // show bit length of huge integers
            if (length > 4) {
                descriptor = current;
                length <<= 3; /* calculate bit length */

                while (((descriptor ^ padding) & 0x80) == 0) {
                    descriptor <<= 1;
                    --length;
                }
                descriptor = "(" + length + " bit)\n";
            }
            // decode the integer
            if (negative) current = current - 256;

            let number = "";
            if(typeof(Int10) !== "undefined") {
                let n = new Int10(current);
                for (let i = start + 1; i < end; ++i)
                    n.mulAdd(256, this.get(i));
                number = n.toString();
            } else {
                let n = 0;
                for (let i = start + 1; i < end; ++i) {
                    n <<= 8;
                    n += this.get(i);
                }
                number = n.toString();
            }
            return descriptor + number;
        };

        isASCII(start: number, end: number) {
            for (let i = start; i < end; ++i) {
                const c = this.get(i);
                if (c < 32 || c > 176)
                    return false;
            }
            return true;
        };
        
        parseBitString(start, end, maxLength) {
            let unusedBit = this.get(start),
                lenBit = ((end - start - 1) << 3) - unusedBit,
                intro = "(" + lenBit + " bit)\n",
                s = "";
            for (let i = start + 1; i < end; ++i) {
                let b = this.get(i),
                    skip = (i == end - 1) ? unusedBit : 0;
                for (let j = 7; j >= skip; --j)
                    s += (b >> j) & 1 ? "1" : "0";
                if (s.length > maxLength)
                    return intro + string_cut(s, maxLength);
            }
            return intro + s;
        };

        parseOctetString(start, end, maxLength) {
            if (this.isASCII(start, end))
                return string_cut(this.parseStringISO(start, end), maxLength);
            let len = end - start,
                s = "(" + len + " byte)\n";
            maxLength /= 2; // we work in bytes
            if (len > maxLength)
                end = start + maxLength;
            for (let i = start; i < end; ++i)
                s += this.hexByte(this.get(i));
            if (len > maxLength)
                s += ellipsis;
            return s;
        };

        parseOID(start, end, maxLength) {
            let s = '',
                n = new Int10(),
                bits = 0;
            for (let i = start; i < end; ++i) {
                let v = this.get(i);
                n.mulAdd(128, v & 0x7F);
                bits += 7;
                if (!(v & 0x80)) { // finished
                    if (s === '') {
                        n = n.simplify();
                        if (n instanceof Int10) {
                            n.sub(80);
                            s = "2." + n.toString();
                        } else {
                            let m = n < 80 ? n < 40 ? 0 : 1 : 2;
                            s = m + "." + (n - m * 40);
                        }
                    } else
                        s += "." + n.toString();
                    if (s.length > maxLength)
                        return string_cut(s, maxLength);
                    n = new Int10();
                    bits = 0;
                }
            }
            if (bits > 0)
                s += ".incomplete";
            /* FIXME
            if (typeof oids === 'object') {
                let oid = oids[s];
                if (oid) {
                    if (oid.d) s += "\n" + oid.d;
                    if (oid.c) s += "\n" + oid.c;
                    if (oid.w) s += "\n(warning!)";
                }
            }
            */
            return s;
        };
    }

    export enum TagClass {
        UNIVERSAL = 0x00,
        APPLICATION = 0x01,
        CONTEXT = 0x02,
        PRIVATE = 0x03
    }

    export enum TagType {
        EOC = 0x00,
        BOOLEAN = 0x01,
        INTEGER = 0x02,
        BIT_STRING = 0x03,
        OCTET_STRING = 0x04,
        NULL = 0x05,
        OBJECT_IDENTIFIER = 0x06,
        ObjectDescriptor = 0x07,
        EXTERNAL = 0x08,
        REAL = 0x09,
        ENUMERATED = 0x0A,
        EMBEDDED_PDV = 0x0B,
        UTF8String = 0x0C,
        SEQUENCE = 0x10,
        SET = 0x11,
        NumericString = 0x12,
        PrintableString = 0x13, // ASCII subset
        TeletextString = 0x14, // aka T61String
        VideotexString = 0x15,
        IA5String = 0x16, // ASCII
        UTCTime = 0x17,
        GeneralizedTime = 0x18,
        GraphicString = 0x19,
        VisibleString = 0x1A, // ASCII subset
        GeneralString = 0x1B,
        UniversalString = 0x1C,
        BMPString = 0x1E
    }

    class ASN1Tag {
        tagClass: TagClass;
        type: TagType;
        tagConstructed: boolean;
        tagNumber: number;

        constructor(stream: Stream) {
            let buf = stream.get();
            this.tagClass = buf >> 6;
            this.tagConstructed = ((buf & 0x20) !== 0);
            this.tagNumber = buf & 0x1F;
            if (this.tagNumber == 0x1F) { // long tag
                let n = new Int10();
                do {
                    buf = stream.get();
                    n.mulAdd(128, buf & 0x7F);
                } while (buf & 0x80);
                this.tagNumber = n.simplify();
            }
        }

        isUniversal() {
            return this.tagClass === 0x00;
        };

        isEOC() {
            return this.tagClass === 0x00 && this.tagNumber === 0x00;
        };
    }

    export class ASN1 {
        stream: Stream;
        header: number;
        length: number;
        tag: ASN1Tag;
        children: ASN1[];

        constructor(stream: Stream, header: number, length: number, tag: ASN1Tag, children: ASN1[]) {
            this.stream = stream;
            this.header = header;
            this.length = length;
            this.tag = tag;
            this.children = children;
        }

        content(max_length?: number, type?: TagType) { // a preview of the content (intended for humans)
            if (this.tag === undefined) return null;
            if (max_length === undefined)
                max_length = Infinity;

            let content = this.posContent(),
                len = Math.abs(this.length);

            if (!this.tag.isUniversal()) {
                if (this.children !== null)
                    return "(" + this.children.length + " elem)";
                return this.stream.parseOctetString(content, content + len, max_length);
            }
            switch (type || this.tag.tagNumber) {
                case 0x01: // BOOLEAN
                    return (this.stream.get(content) === 0) ? "false" : "true";
                case 0x02: // INTEGER
                    return this.stream.parseInteger(content, content + len);
                case 0x03: // BIT_STRING
                    return this.children ? "(" + this.children.length + " elem)" :
                        this.stream.parseBitString(content, content + len, max_length);
                case 0x04: // OCTET_STRING
                    return this.children ? "(" + this.children.length + " elem)" :
                        this.stream.parseOctetString(content, content + len, max_length);
                //case 0x05: // NULL
                case 0x06: // OBJECT_IDENTIFIER
                    return this.stream.parseOID(content, content + len, max_length);
                //case 0x07: // ObjectDescriptor
                //case 0x08: // EXTERNAL
                //case 0x09: // REAL
                //case 0x0A: // ENUMERATED
                //case 0x0B: // EMBEDDED_PDV
                case 0x10: // SEQUENCE
                case 0x11: // SET
                    if (this.children !== null)
                        return "(" + this.children.length + " elem)";
                    else
                        return "(no elem)";
                case 0x0C: // UTF8String
                    return string_cut(this.stream.parseStringUTF(content, content + len), max_length);
                case 0x12: // NumericString
                case 0x13: // PrintableString
                case 0x14: // TeletexString
                case 0x15: // VideotexString
                case 0x16: // IA5String
                //case 0x19: // GraphicString
                case 0x1A: // VisibleString
                    //case 0x1B: // GeneralString
                    //case 0x1C: // UniversalString
                    return string_cut(this.stream.parseStringISO(content, content + len), max_length);
                case 0x1E: // BMPString
                    return string_cut(this.stream.parseStringBMP(content, content + len), max_length);
                case 0x17: // UTCTime
                case 0x18: // GeneralizedTime
                    return this.stream.parseTime(content, content + len, (this.tag.tagNumber == 0x17));
            }
            return null;
        };

        typeName(): string {
            switch (this.tag.tagClass) {
                case 0: // universal
                    return TagType[this.tag.tagNumber] || ("Universal_" + this.tag.tagNumber.toString());
                case 1:
                    return "Application_" + this.tag.tagNumber.toString();
                case 2:
                    return "[" + this.tag.tagNumber.toString() + "]"; // Context
                case 3:
                    return "Private_" + this.tag.tagNumber.toString();
            }
        };

        toString() {
            return this.typeName() + "@" + this.stream.position + "[header:" + this.header + ",length:" + this.length + ",sub:" + ((this.children === null) ? 'null' : this.children.length) + "]";
        }

        toPrettyString(indent) {
            if (indent === undefined) indent = '';
            let s = indent + this.typeName() + " @" + this.stream.position;
            if (this.length >= 0)
                s += "+";
            s += this.length;
            if (this.tag.tagConstructed)
                s += " (constructed)";
            else if ((this.tag.isUniversal() && ((this.tag.tagNumber == 0x03) || (this.tag.tagNumber == 0x04))) && (this.children !== null))
                s += " (encapsulates)";
            let content = this.content();
            if (content)
                s += ": " + content.replace(/\n/g, '|');
            s += "\n";
            if (this.children !== null) {
                indent += '  ';
                for (let i = 0, max = this.children.length; i < max; ++i)
                    s += this.children[i].toPrettyString(indent);
            }
            return s;
        };

        posStart() {
            return this.stream.position;
        };

        posContent() {
            return this.stream.position + this.header;
        };

        posEnd() {
            return this.stream.position + this.header + Math.abs(this.length);
        };

        static decodeLength(stream: Stream) {
            let buf = stream.get();
            const len = buf & 0x7F;
            if (len == buf)
                return len;
            if (len > 6) // no reason to use Int10, as it would be a huge buffer anyways
                throw "Length over 48 bits not supported at position " + (stream.position - 1);
            if (len === 0)
                return null; // undefined

            buf = 0;
            for (let i = 0; i < len; ++i)
                buf = (buf << 8) + stream.get();
            return buf;
        };

        static encodeLength(buffer: Uint8Array, offset: number, length: number) {
            if(length < 0x7F) {
                buffer[offset] = length;
            } else {
                buffer[offset] = 0x80;
                let index = 1;
                while(length > 0) {
                    buffer[offset + index++] = length & 0xFF;
                    length >>= 8;
                    buffer[offset] += 1;
                }
            }
        }
    }

    function decode0(stream: Stream) {
        const streamStart = new Stream(stream, 0); /* copy */
        const tag = new ASN1Tag(stream);
        let len = ASN1.decodeLength(stream);
        const start = stream.position;
        const length_header = start - streamStart.position;
        let children = null;
        const query_children = () => {
            children = [];
            if (len !== null) {
                const end = start + len;
                if (end > stream.length())
                    throw 'Container at offset ' + start + ' has a length of ' + len + ', which is past the end of the stream';
                while (stream.position < end)
                    children[children.length] = decode0(stream);
                if (stream.position != end)
                    throw 'Content size is not correct for container at offset ' + start;
            } else {
                // undefined length
                try {
                    while (true) {
                        const s = decode0(stream);
                        if (s.tag.isEOC()) break;
                        children[children.length] = s;
                    }
                    len = start - stream.position; // undefined lengths are represented as negative values
                } catch (e) {
                    throw 'Exception while decoding undefined length content at offset ' + start + ': ' + e;
                }
            }
        };
        if (tag.tagConstructed) {
            // must have valid content
            query_children();
        } else if (tag.isUniversal() && ((tag.tagNumber == 0x03) || (tag.tagNumber == 0x04))) {
            // sometimes BitString and OctetString are used to encapsulate ASN.1
            try {
                if (tag.tagNumber == 0x03)
                    if (stream.get() != 0)
                        throw "BIT STRINGs with unused bits cannot encapsulate.";
                query_children();
                for (let i = 0; i < children.length; ++i)
                    if (children[i].tag.isEOC())
                        throw 'EOC is not supposed to be actual content.';
            } catch (e) {
                // but silently ignore when they don't
                children = null;
                //DEBUG console.log('Could not decode structure at ' + start + ':', e);
            }
        }
        if (children === null) {
            if (len === null)
                throw "We can't skip over an invalid tag with undefined length at offset " + start;
            stream.position = start + Math.abs(len);
        }
        return new ASN1(streamStart, length_header, len, tag, children);
    }

    export function decode(stream: string | ArrayBuffer) {
        return decode0(new Stream(stream, 0));
    }
}