import {LogCategory, logDebug} from "tc-shared/log";
import {CallOnce} from "tc-shared/proto";

export type Entry = {
    timestamp: number;

    upload?: number;
    download?: number;

    highlight?: boolean;
}

export type Style = {
    backgroundColor: string;

    separatorColor: string;
    separatorCount: number;
    separatorWidth: number;

    upload: {
        fill: string;
        stroke: string;
        strokeWidth: number;
    },
    download: {
        fill: string;
        stroke: string;
        strokeWidth: number;
    }
}

export type TimeSpan = {
    origin: {
        begin: number;
        end: number;
        time: number;
    },
    target: {
        begin: number;
        end: number;
        time: number;
    }
}

export class Graph {
    private static animateCallbacks: (() => any)[] = [];
    private static registerAnimateCallback(callback: () => void) {
        this.animateCallbacks.push(callback);
        if(this.animateCallbacks.length === 1) {
            const animateLoop = () => {
                Graph.animateCallbacks.forEach(l => l());
                if(Graph.animateCallbacks.length > 0) {
                    requestAnimationFrame(animateLoop);
                } else {
                    logDebug(LogCategory.GENERAL, tr("NetGraph static terminate"));
                }
            };
            animateLoop();
        }
    }

    private static removerAnimateCallback(callback: () => void) {
        this.animateCallbacks.remove(callback);
    }

    public style: Style = {
        backgroundColor: "#28292b",

        separatorColor: "#283036",
        separatorCount: 10,
        separatorWidth: 1,


        upload: {
            fill: "#2d3f4d",
            stroke: "#336e9f",
            strokeWidth: 2,
        },

        download: {
            fill: "#532c26",
            stroke: "#a9321c",
            strokeWidth: 2,
        }
    };

    private canvas: HTMLCanvasElement;
    private canvasContext: CanvasRenderingContext2D;

    private entries: Entry[] = [];
    private entriesMax = {
        upload: 1,
        download: 1,
    };
    private maxSpace = 1.12;
    private maxGap = 5;
    private animateLoop;

    timeSpan: TimeSpan = {
        origin: {
            begin: 0,
            end: 1,
            time: 0
        },
        target: {
            begin: 0,
            end: 1,
            time: 1
        }
    };

    private detailShown = false;
    callbackDetailedInfo: (upload: number, download: number, timestamp: number, event: MouseEvent) => any;
    callbackDetailedHide: () => any;

    constructor() {
        this.animateLoop = () => this.draw();
        this.recalculateCache(); /* initialize cache */
    }

    @CallOnce
    initialize() { }

    @CallOnce
    finalize() {
        this.initializeCanvas(undefined);
    }

    initializeCanvas(canvas: HTMLCanvasElement | undefined) {
        if(this.canvas) {
            this.canvas.onmousemove = undefined;
            this.canvas.onmouseleave = undefined;

            this.canvas = undefined;
            this.canvasContext = undefined;
            Graph.removerAnimateCallback(this.animateLoop);
        }

        if(!canvas) {
            return;
        }

        this.canvas = canvas;
        this.canvasContext = this.canvas.getContext("2d");

        Graph.registerAnimateCallback(this.animateLoop);
        this.canvas.onmousemove = this.onMouseMove.bind(this);
        this.canvas.onmouseleave = this.onMouseLeave.bind(this);
    }

    maxGapSize(value?: number) : number { return typeof(value) === "number" ? (this.maxGap = value) : this.maxGap; }

    private recalculateCache(timespan?: boolean) {
        this.entries = this.entries.sort((a, b) => a.timestamp - b.timestamp);
        this.entriesMax = {
            download: 1,
            upload: 1
        };
        if(timespan) {
            this.timeSpan = {
                origin: {
                    begin: 0,
                    end: 0,
                    time: 0
                },
                target: {
                    begin: this.entries.length > 0 ? this.entries[0].timestamp : 0,
                    end: this.entries.length > 0 ? this.entries.last().timestamp : 0,
                    time: 0
                }
            };
        }

        for(const entry of this.entries) {
            if(typeof(entry.upload) === "number") {
                this.entriesMax.upload = Math.max(this.entriesMax.upload, entry.upload);
            }

            if(typeof(entry.download) === "number") {
                this.entriesMax.download = Math.max(this.entriesMax.download, entry.download);
            }
        }

        this.entriesMax.upload *= this.maxSpace;
        this.entriesMax.download *= this.maxSpace;
    }

    entryCount() : number {
        return this.entries.length;
    }

    pushEntry(entry: Entry) {
        if(this.entries.length > 0 && entry.timestamp < this.entries.last().timestamp) {
            throw "invalid timestamp";
        }

        this.entries.push(entry);

        if(typeof entry.upload === "number") {
            this.entriesMax.upload = Math.max(this.entriesMax.upload, entry.upload * this.maxSpace);
        }

        if(typeof entry.download === "number") {
            this.entriesMax.download = Math.max(this.entriesMax.download, entry.download * this.maxSpace);
        }
    }

    insertEntries(entries: Entry[]) {
        this.entries.push(...entries);
        this.recalculateCache();
        this.cleanup();
    }

    resize() {
        this.canvas.style.height = "100%";
        this.canvas.style.width = "100%";

        /* TODO: Do this within the next animate loop. We don't have to do this right here! */
        const cstyle = getComputedStyle(this.canvas);
        this.canvas.width = parseInt(cstyle.width);
        this.canvas.height = parseInt(cstyle.height);
    }

    cleanup() {
        const time = this.calculateTimespan();

        let index = 0;
        for(;index < this.entries.length; index++) {
            if(this.entries[index].timestamp < time.begin) {
                continue;
            }

            if(index == 0) {
                return;
            }
            break;
        }

        /* keep the last entry as a reference point to the left */
        if(index > 1) {
            this.entries.splice(0, index - 1);
            this.recalculateCache();
        }
    }

    calculateTimespan() : { begin: number; end: number } {
        const time = Date.now();
        if(time >= this.timeSpan.target.time) {
            return this.timeSpan.target;
        }

        if(time <= this.timeSpan.origin.time) {
            return this.timeSpan.origin;
        }

        const ob = this.timeSpan.origin.begin;
        const oe = this.timeSpan.origin.end;
        const ot = this.timeSpan.origin.time;

        const tb = this.timeSpan.target.begin;
        const te = this.timeSpan.target.end;
        const tt = this.timeSpan.target.time;

        const offset = (time - ot) / (tt - ot);
        return {
            begin: ob + (tb - ob) * offset,
            end: oe + (te - oe) * offset,
        };
    }

    private draw() {
        let ctx = this.canvasContext;

        const height = this.canvas.height;
        const width = this.canvas.width;

        //console.log("Painting on %ox%o", height, width);

        ctx.shadowBlur = 0;
        ctx.filter = "";
        ctx.lineCap = "square";

        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        /* first of all print the separators */
        {
            const sw = this.style.separatorWidth;
            const swh = this.style.separatorWidth / 2;

            ctx.lineWidth = sw;
            ctx.strokeStyle = this.style.separatorColor;

            ctx.beginPath();
            /* horizontal */
            {
                const dw = width / this.style.separatorCount;
                let dx = dw / 2;
                while(dx < width) {
                    ctx.moveTo(Math.floor(dx - swh) + .5, .5);
                    ctx.lineTo(Math.floor(dx - swh) + .5, Math.floor(height) + .5);
                    dx += dw;
                }
            }

            /* vertical */
            {
                const dh = height / 3; //tree lines (top, center, bottom)

                let dy = dh / 2;
                while(dy < height) {
                    ctx.moveTo(.5, Math.floor(dy - swh) + .5);
                    ctx.lineTo(Math.floor(width) + .5, Math.floor(dy - swh) + .5);
                    dy += dh;
                }
            }
            ctx.stroke();
            ctx.closePath();
        }

        /* draw the lines */
        {
            const t = this.calculateTimespan();
            const tb = t.begin; /* time begin */
            const dt = t.end - t.begin; /* delta time */
            const dtw = width / dt; /* delta time width */

            const drawGraph = (type: "upload" | "download", direction: number, max: number) => {
                const hy = Math.floor(height / 2); /* half y */
                const by = hy - direction * this.style[type].strokeWidth; /* the "base" line */

                const marked_points: ({x: number, y: number})[] = [];

                ctx.beginPath();
                ctx.moveTo(0, by);

                let x, y, lx = 0, ly = by; /* last x, last y */

                const floor = a => a; //Math.floor;
                for(const entry of this.entries) {
                    x = floor((entry.timestamp - tb) * dtw);
                    if(typeof entry[type] === "number") {
                        y = floor(hy - direction * Math.max(hy * (entry[type] / max), this.style[type].strokeWidth));
                    } else {
                        y = hy - direction * this.style[type].strokeWidth;
                    }

                    if(entry.timestamp < tb) {
                        lx = x;
                        ly = y;

                        continue;
                    }

                    if(x - lx > this.maxGap && this.maxGap > 0) {
                        ctx.lineTo(lx, by);
                        ctx.lineTo(x, by);
                        ctx.lineTo(x, y);

                        lx = x;
                        ly = y;
                        continue;
                    }

                    ctx.bezierCurveTo((x + lx) / 2, ly, (x + lx) / 2, y, x, y);
                    if(entry.highlight)
                        marked_points.push({x: x, y: y});

                    lx = x;
                    ly = y;
                }

                ctx.strokeStyle = this.style[type].stroke;
                ctx.lineWidth = this.style[type].strokeWidth;
                ctx.lineJoin = "miter";
                ctx.stroke();

                //Close the path and fill
                ctx.lineTo(width, hy);
                ctx.lineTo(0, hy);

                ctx.fillStyle = this.style[type].fill;
                ctx.fill();

                ctx.closePath();

                {
                    ctx.beginPath();
                    const radius = 3;
                    for(const point of marked_points) {
                        ctx.moveTo(point.x, point.y);
                        ctx.ellipse(point.x, point.y, radius, radius, 0, 0, 2 * Math.PI, false);

                    }
                    ctx.stroke();
                    ctx.fill();

                    ctx.closePath();
                }
            };

            const shared_max = Math.max(this.entriesMax.upload, this.entriesMax.download);
            drawGraph("upload", 1, shared_max);
            drawGraph("download", -1, shared_max);
        }
    }

    private onMouseMove(event: MouseEvent) {
        const offset = event.offsetX;
        const max_offset = this.canvas.width;

        if(offset < 0) return;
        if(offset > max_offset) return;

        const time_span = this.calculateTimespan();
        const time = time_span.begin + (time_span.end - time_span.begin) * (offset / max_offset);
        let index = 0;
        for(;index < this.entries.length; index++) {
            if(this.entries[index].timestamp > time) {
                break;
            }
        }

        const entry_before = this.entries[index - 1]; /* In JS negative array access is allowed and returns undefined */
        const entry_next = this.entries[index]; /* In JS negative array access is allowed and returns undefined */
        let entry: Entry;
        if(!entry_before || !entry_next) {
            entry = entry_before || entry_next;
        } else {
            const dn = entry_next.timestamp - time;
            const db = time - entry_before.timestamp;
            if(dn > db)
                entry = entry_before;
            else
                entry = entry_next;
        }

        if(!entry) {
            this.onMouseLeave(event);
        } else {
            this.entries.forEach(e => e.highlight = false);
            this.detailShown = true;
            entry.highlight = true;

            if(this.callbackDetailedInfo) {
                this.callbackDetailedInfo(entry.upload, entry.download, entry.timestamp, event);
            }
        }

    }

    private onMouseLeave(_event: MouseEvent) {
        if(!this.detailShown) {
            return;
        }
        this.detailShown = false;

        this.entries.forEach(e => e.highlight = false);
        if(this.callbackDetailedHide) {
            this.callbackDetailedHide();
        }
    }
}