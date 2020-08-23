import {ChangeLog, ChangeSetEntry} from "tc-shared/update/ChangeLog";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setUIUpdater} from "tc-shared/update/index";
import {Updater} from "tc-shared/update/Updater";
import {LogCategory, logError, logWarn} from "tc-shared/log";

const ChangeLogContents: string = require("../../../ChangeLog.md");
const EntryRegex = /^\* \*\*([0-9]{2})\.([0-9]{2})\.([0-9]{2})\*\*$/m;
const TimeStampRegex = /^([0-9]{2})\.([0-9]{2})\.([0-9]{2})$/m;

function parseChangeLogEntry(lines: string[], index: number) : { entries: ChangeSetEntry[], index: number } {
    const entryDepth = lines[index].indexOf("-");
    if(entryDepth === -1) {
        throw "missing entry depth for line " + index;
    }

    let entries = [] as ChangeSetEntry[];
    let currentEntry;
    while(index < lines.length && !lines[index].match(EntryRegex)) {
        let trimmed = lines[index].trim();
        if(trimmed.length === 0) {
            index++;
            continue;
        }

        if(trimmed[0] === '-') {
            const depth = lines[index].indexOf('-');
            if(depth > entryDepth) {
                if(typeof currentEntry === "undefined")
                    throw "missing change child entries parent at line " + index;

                const result = parseChangeLogEntry(lines, index);
                entries.push({
                    changes: result.entries,
                    title: currentEntry
                });
                index = result.index;
            } else if(depth < entryDepth) {
                /* we're done with our block */
                break;
            } else {
                /* new entry */
                if(typeof currentEntry === "string")
                    entries.push(currentEntry);

                currentEntry = trimmed.substr(1).trim();
            }
        } else {
            if(typeof currentEntry === "undefined")
                throw "this should never happen!";

            currentEntry += "\n" + trimmed;
        }

        index++;
    }

    if(typeof currentEntry === "string")
        entries.push(currentEntry);

    return {
        index: index,
        entries: entries
    };
}

function parseUIChangeLog() : ChangeLog {
    let result: ChangeLog = {
        currentVersion: "unknown",
        changes: []
    }

    const lines = ChangeLogContents.split("\n");
    let index = 0;

    while(index < lines.length && !lines[index].match(EntryRegex))
        index++;

    while(index < lines.length) {
        const [ _, day, month, year ] = lines[index].match(EntryRegex);

        const entry = parseChangeLogEntry(lines, index + 1);
        result.changes.push({
            timestamp: day + "." + month + "." + year,
            changes: entry.entries
        });

        index = entry.index;
    }

    return result;
}

const kLastUsedVersionKey = "updater-used-version-web";
class WebUpdater implements Updater {
    private readonly changeLog: ChangeLog;
    private readonly currentVersion: string;

    constructor() {
        this.changeLog = parseUIChangeLog();

        const currentBuildTimestamp = new Date(__build.timestamp * 1000);
        this.currentVersion = ("00" + currentBuildTimestamp.getUTCDate()).substr(-2) + "." +
                              ("00" + currentBuildTimestamp.getUTCMonth()).substr(-2) + "." +
                              currentBuildTimestamp.getUTCFullYear().toString().substr(2);
    }

    getChangeLog(): ChangeLog {
        return this.changeLog;
    }

    getChangeList(oldVersion: string): ChangeLog {
        let changes = {
            changes: [],
            currentVersion: this.currentVersion
        } as ChangeLog;

        try {
            const [ _, oldDay, oldMonth, oldYear ] = oldVersion.match(TimeStampRegex);
            const oldDate = new Date(parseInt(oldYear), parseInt(oldMonth), parseInt(oldDay));

            for(const change of this.getChangeLog().changes) {
                const [ _, currentDay, currentMonth, currentYear ] = change.timestamp.match(TimeStampRegex);
                const currentDate = new Date(parseInt(currentYear), parseInt(currentMonth), parseInt(currentDay));

                if(currentDate.getTime() <= oldDate.getTime())
                    break;

                changes.changes.push(change);
            }
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to gather a change list from version %s: %o"), oldVersion, error);
            return this.getChangeLog();
        }

        return changes;
    }

    getCurrentVersion(): string {
        return this.currentVersion;
    }

    getLastUsedVersion(): string {
        return localStorage.getItem(kLastUsedVersionKey) || "08.08.20";
    }

    updateUsedVersion() {
        localStorage.setItem(kLastUsedVersionKey, this.getCurrentVersion());
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "web updater init",
    function: async () => {
        setUIUpdater(new WebUpdater());
    },
    priority: 50
});