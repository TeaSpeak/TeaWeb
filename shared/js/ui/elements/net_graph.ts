namespace net.graph {
    export type Entry = {
        timestamp: number;

        upload: number;
        download: number;

        highlight?: boolean;
    }

    export type Style = {
        background_color: string;

        separator_color: string;
        separator_count: number;
        separator_width: number;

        upload: {
            fill: string;
            stroke: string;
            strike_width: number;
        },
        download: {
            fill: string;
            stroke: string;
            strike_width: number;
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

    /* Great explanation of Bezier curves: http://en.wikipedia.org/wiki/Bezier_curve#Quadratic_curves
     *
     * Assuming A was the last point in the line plotted and B is the new point,
     * we draw a curve with control points P and Q as below.
     *
     * A---P
     *     |
     *     |
     *     |
     *     Q---B
     *
     * Importantly, A and P are at the same y coordinate, as are B and Q. This is
     * so adjacent curves appear to flow as one.
     */
    export class Graph {
        private static _loops: (() => any)[] = [];

        readonly canvas: HTMLCanvasElement;
        public style: Style = {
            background_color: "#28292b",
            //background_color: "red",

            separator_color: "#283036",
            //separator_color: 'blue',
            separator_count: 10,
            separator_width: 1,


            upload: {
                fill: "#2d3f4d",
                stroke: "#336e9f",
                strike_width: 2,
            },

            download: {
                fill: "#532c26",
                stroke: "#a9321c",
                strike_width: 2,
            }
        };

        private _canvas_context: CanvasRenderingContext2D;
        private _entries: Entry[] = [];
        private _entry_max = {
            upload: 1,
            download: 1,
        };
        private _max_space = 1.12;
        private _max_gap = 5;
        private _listener_mouse_move;
        private _listener_mouse_out;
        private _animate_loop;

        _time_span: TimeSpan = {
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

        private _detailed_shown = false;
        callback_detailed_info: (upload: number, download: number, timestamp: number, event: MouseEvent) => any;
        callback_detailed_hide: () => any;

        constructor(canvas: HTMLCanvasElement) {
            this.canvas = canvas;
            this._animate_loop = () => this.draw();
            this.recalculate_cache(); /* initialize cache */
        }

        initialize() {
            this._canvas_context = this.canvas.getContext("2d");

            Graph._loops.push(this._animate_loop);
            if(Graph._loops.length == 1) {
                const static_loop = () => {
                    Graph._loops.forEach(l => l());
                    if(Graph._loops.length > 0)
                        requestAnimationFrame(static_loop);
                    else
                        console.log("STATIC terminate!");
                };
                static_loop();
            }

            this.canvas.onmousemove = this.on_mouse_move.bind(this);
            this.canvas.onmouseleave = this.on_mouse_leave.bind(this);
        }

        terminate() {
            Graph._loops.remove(this._animate_loop);
        }

        max_gap_size(value?: number) : number { return typeof(value) === "number" ? (this._max_gap = value) : this._max_gap; }

        private recalculate_cache(time_span?: boolean) {
            this._entries = this._entries.sort((a, b) => a.timestamp - b.timestamp);
            this._entry_max = {
                download: 1,
                upload: 1
            };
            if(time_span) {
                this._time_span = {
                    origin: {
                        begin: 0,
                        end: 0,
                        time: 0
                    },
                    target: {
                        begin: this._entries.length > 0 ? this._entries[0].timestamp : 0,
                        end: this._entries.length > 0 ? this._entries.last().timestamp : 0,
                        time: 0
                    }
                };
            }

            for(const entry of this._entries) {
                this._entry_max.upload = Math.max(this._entry_max.upload, entry.upload);
                this._entry_max.download = Math.max(this._entry_max.download, entry.download);
            }

            this._entry_max.upload *= this._max_space;
            this._entry_max.download *= this._max_space;
        }

        insert_entry(entry: Entry) {
            if(this._entries.length > 0 && entry.timestamp < this._entries.last().timestamp)
                throw "invalid timestamp";

            this._entries.push(entry);

            this._entry_max.upload = Math.max(this._entry_max.upload, entry.upload * this._max_space);
            this._entry_max.download = Math.max(this._entry_max.download, entry.download * this._max_space);
        }

        insert_entries(entries: Entry[]) {
            this._entries.push(...entries);
            this.recalculate_cache();
            this.cleanup();
        }

        resize() {
            this.canvas.style.height = "100%";
            this.canvas.style.width = "100%";
            const cstyle = getComputedStyle(this.canvas);

            this.canvas.width = parseInt(cstyle.width);
            this.canvas.height = parseInt(cstyle.height);
        }

        cleanup() {
            const time = this.calculate_time_span();

            let index = 0;
            for(;index < this._entries.length; index++) {
                if(this._entries[index].timestamp < time.begin)
                    continue;

                if(index == 0)
                    return;
                break;
            }

            /* keep the last entry as a reference point to the left */
            if(index > 1) {
                this._entries.splice(0, index - 1);
                this.recalculate_cache();
            }
        }

        calculate_time_span() : { begin: number; end: number } {
            const time = Date.now();
            if(time >= this._time_span.target.time)
                return this._time_span.target;

            if(time <= this._time_span.origin.time)
                return this._time_span.origin;

            const ob = this._time_span.origin.begin;
            const oe = this._time_span.origin.end;
            const ot = this._time_span.origin.time;

            const tb = this._time_span.target.begin;
            const te = this._time_span.target.end;
            const tt = this._time_span.target.time;

            const offset = (time - ot) / (tt - ot);
            return {
                begin: ob + (tb - ob) * offset,
                end: oe + (te - oe) * offset,
            };
        }

        draw() {
            let ctx = this._canvas_context;

            const height = this.canvas.height;
            const width = this.canvas.width;

            //console.log("Painting on %ox%o", height, width);

            ctx.shadowBlur = 0;
            ctx.filter = "";
            ctx.lineCap = "square";

            ctx.fillStyle = this.style.background_color;
            ctx.fillRect(0, 0, width, height);

            /* first of all print the separators */
            {
                const sw = this.style.separator_width;
                const swh = this.style.separator_width / 2;

                ctx.lineWidth = sw;
                ctx.strokeStyle = this.style.separator_color;

                ctx.beginPath();
                /* horizontal */
                {
                    const dw = width / this.style.separator_count;
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
                const t = this.calculate_time_span();
                const tb = t.begin; /* time begin */
                const dt = t.end - t.begin; /* delta time */
                const dtw = width / dt; /* delta time width */

                const draw_graph = (type: "upload" | "download", direction: number, max: number) => {
                    const hy = Math.floor(height / 2); /* half y */
                    const by = hy - direction * this.style[type].strike_width; /* the "base" line */

                    const marked_points: ({x: number, y: number})[] = [];

                    ctx.beginPath();
                    ctx.moveTo(0, by);

                    let x, y, lx = 0, ly = by; /* last x, last y */

                    const floor = a => a; //Math.floor;
                    for(const entry of this._entries) {
                        x = floor((entry.timestamp - tb) * dtw);
                        y = floor(hy - direction * Math.max(hy * (entry[type] / max), this.style[type].strike_width));

                        if(entry.timestamp < tb) {
                            lx = x;
                            ly = y;

                            continue;
                        }

                        if(x - lx > this._max_gap && this._max_gap > 0) {
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
                    ctx.lineWidth = this.style[type].strike_width;
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

                const shared_max = Math.max(this._entry_max.upload, this._entry_max.download);
                draw_graph("upload", 1, shared_max);
                draw_graph("download", -1, shared_max);
            }
        }

        private on_mouse_move(event: MouseEvent) {
            const offset = event.offsetX;
            const max_offset = this.canvas.width;

            if(offset < 0) return;
            if(offset > max_offset) return;

            const time_span = this.calculate_time_span();
            const time = time_span.begin + (time_span.end - time_span.begin) * (offset / max_offset);
            let index = 0;
            for(;index < this._entries.length; index++) {
                if(this._entries[index].timestamp > time)
                    break;
            }

            const entry_before = this._entries[index - 1]; /* In JS negative array access is allowed and returns undefined */
            const entry_next = this._entries[index]; /* In JS negative array access is allowed and returns undefined */
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
                this.on_mouse_leave(event);
            } else {
                this._entries.forEach(e => e.highlight = false);
                this._detailed_shown = true;
                entry.highlight = true;

                if(this.callback_detailed_info)
                    this.callback_detailed_info(entry.upload, entry.download, entry.timestamp, event);
            }

        }

        private on_mouse_leave(event: MouseEvent) {
            if(!this._detailed_shown) return;
            this._detailed_shown = false;

            this._entries.forEach(e => e.highlight = false);
            if(this.callback_detailed_hide)
                this.callback_detailed_hide();
        }
    }
}