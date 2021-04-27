import {ServerCommand} from "tc-shared/connection/ConnectionBase";

function unescapeCommandValue(value: string) : string {
    let result = "", index = 0, lastIndex = 0;

    while (true) {
        index = value.indexOf('\\', lastIndex);
        if(index === -1 || index >= value.length + 1) {
            break;
        }

        let replace;
        switch (value.charAt(index + 1)) {
            case 's': replace = ' '; break;
            case '/': replace = '/'; break;
            case 'p': replace = '|'; break;
            case 'b': replace = '\b'; break;
            case 'f': replace = '\f'; break;
            case 'n': replace = '\n'; break;
            case 'r': replace = '\r'; break;
            case 't': replace = '\t'; break;
            case 'a': replace = '\x07'; break;
            case 'v': replace = '\x0B'; break;
            case '\\': replace = '\\'; break;
            default:
                lastIndex = index + 1;
                continue;
        }

        result += value.substring(lastIndex, index) + replace;
        lastIndex = index + 2;
    }

    return result + value.substring(lastIndex);
}

const escapeCharacterMap = {
    "\\": "\\",
    " ": "s",
    "/": "/",
    "|": "p",
    "\b": "b",
    "\f": "f",
    "\n": "n",
    "\r": "r",
    "\t": "t",
    "\x07": "a",
    "\x0B": "b"
};

const escapeCommandValue = (value: string) => value.replace(/[\\ \/|\b\f\n\r\t\x07]/g, value => "\\" + escapeCharacterMap[value]);

export function parseCommand(command: string): ServerCommand {
    const parts = command.split("|").map(element => element.split(" ").map(e => e.trim()).filter(e => !!e));

    let cmd;
    if(parts[0][0].indexOf("=") === -1) {
        cmd = parts[0].pop_front();
    }

    let switches = [];
    let payloads = [];
    parts.forEach(element => {
        const payload = {};
        for(const keyValue of element) {
            if(keyValue[0] === '-') {
                switches.push(keyValue.substring(1));
                continue;
            }

            const separator = keyValue.indexOf('=');
            if(separator === -1) {
                payload[keyValue] = "";
            } else {
                payload[keyValue.substring(0, separator)] = unescapeCommandValue(keyValue.substring(separator + 1));
            }
        }

        payloads.push(payload)
    });

    return new ServerCommand(cmd, payloads, switches);
}

export function buildCommand(data: any | any[], switches?: string[], command?: string) {
    let result = "";

    for(const payload of Array.isArray(data) ? data : [data]) {
        result += " |";
        for(const key of Object.keys(payload)) {
            result += " " + key;
            if(payload[key] !== undefined && payload[key] !== null) {
                result += " " + key + "=" + escapeCommandValue(payload[key].toString());
            }
        }
    }

    if(switches?.length) {
        result += " " + switches.map(e => "-" + e).join(" ");
    }

    return command ? command + result.substring(2) : result.substring(3);
}