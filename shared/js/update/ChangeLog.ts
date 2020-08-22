export type ChangeSetEntry = ChangeSet | string;

export interface ChangeSet {
    title?: string;
    changes: ChangeSetEntry[];
}

export interface ChangeLogEntry extends ChangeSet {
    timestamp: string;
}

export interface ChangeLog {
    changes: ChangeLogEntry[],
    currentVersion: string
}