import * as React from "react";
import {useContext, useMemo, useRef, useState} from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Layout} from "react-grid-layout";
import * as GridLayout from "react-grid-layout";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import * as _ from "lodash";
import {FontSizeObserver} from "tc-shared/ui/react-elements/FontSize";
import {RendererVideoEventContext, VideoContainer} from "tc-shared/ui/frames/video/Renderer";

import "!style-loader!css-loader?url=false!sass-loader?sourceMap=true!react-resizable/css/styles.css";
import "!style-loader!css-loader?url=false!sass-loader?sourceMap=true!react-grid-layout/css/styles.css";
import {useGlobalSetting} from "tc-shared/ui/react-elements/Helper";
import {Settings} from "tc-shared/settings";

export type SpotlightDimensions = { width: number, height: number };
export const SpotlightDimensionsContext = React.createContext<SpotlightDimensions>(undefined);

const cssStyle = require("./Renderer.scss");

const SpotlightSingle = () => {
    const events = useContext(RendererVideoEventContext);
    const refContainer = useRef<HTMLDivElement>();

    const [ videoId, setVideoId ] = useState<string>(() => {
        events.fire("query_spotlight");
        return undefined;
    });
    events.reactUse("notify_spotlight", event => {
        setVideoId(event.videoId.last());
        const dropped = event.videoId.slice(0, event.videoId.length - 1);
        if(dropped.length > 0) {
            events.fire("action_toggle_spotlight", { expend: false, enabled: false, videoIds: dropped });
        }
    }, undefined, []);
    events.reactUse("action_focus_spotlight", () => refContainer.current?.focus(), undefined, []);

    let body;
    if(videoId) {
        body = <VideoContainer videoId={videoId} key={"video-" + videoId} isSpotlight={true} />;
    } else {
        body = (
            <div className={cssStyle.videoContainer + " " + cssStyle.outlined} key={"no-video"}>
                <div className={cssStyle.text}><Translatable>No spotlight selected</Translatable></div>
            </div>
        );
    }

    return (
        <div
            className={cssStyle.spotlight}
            onKeyDown={event => {
                if(event.key === "Escape") {
                    events.fire("action_toggle_spotlight", { videoIds: [ videoId ], expend: false, enabled: false });
                }
            }}
            tabIndex={0}
            ref={refContainer}
        >
            {body}
        </div>
    )
};

type Rectangle = { x: number, y: number, w: number, h: number };
const largestRectangleInHistogram = (histogram: number[]) : Rectangle => {
    const len = histogram.length;
    const stack = [];
    let max = 0, maxH, maxW, maxX;
    let h, w;

    for (let i = 0; i <= len; i++) {
        while (stack.length && (i === len || histogram[i] <= histogram[stack[stack.length - 1]])) {
            h = histogram[stack.pop()];
            w = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;

            if(h * w > max) {
                maxH = h;
                maxW = w;
                max = h * w;
                maxX = i;

                while(maxX > 0 && histogram[maxX - 1] >= h) {
                    maxX --;
                }
            }
        }

        stack.push(i);
    }

    return { x: maxX, y: maxH, h: maxH, w: maxW };
};

const largestRectangle = (matrix: boolean[][]) : Rectangle | undefined => {
    let result: Rectangle & { area: number } = { w: -1, h: -1, x: 0, y: 0, area: -1 };

    let histogram = [];
    for(const _ of matrix[0]) { histogram.push(0); }

    for(let row = 0; row < matrix.length; row++) {
        for(let column = 0; column < matrix[row].length; column++) {
            if(matrix[row][column]) {
                histogram[column] += 1;
            } else {
                histogram[column] = 0;
            }
        }

        const rectangle = largestRectangleInHistogram(histogram);
        const area = rectangle.w * rectangle.h;
        if(area > result.area) {
            result = {
                area,
                w: rectangle.w,
                h: rectangle.h,
                x: rectangle.x,
                y: row - rectangle.y + 1
            };
        }
    }

    return result.area === -1 ? undefined : result;
}

/* Numbers given in em units, its a 16:9 ratio */
const kVideoMinWidth = 17.77778;
const kVideoMinHeight = 9;

const kGridScaleFactor = 16;

class SpotlightGridController extends React.PureComponent<{ fontSize: number }, { layout: Layout[] }> {
    private currentLayout: Layout[] = [];
    private columnCount: number;
    private rowCount: number;

    constructor(props) {
        super(props);

        this.state = { layout: [] };
    }

    render() {
        return (
            <RendererVideoEventContext.Consumer>
                {events => (
                    <SpotlightDimensionsContext.Consumer>
                        {containerDimensions => {
                            this.columnCount = Math.floor(Math.max(containerDimensions.width / (kVideoMinWidth * this.props.fontSize), 1)) * kGridScaleFactor;
                            this.rowCount = Math.floor(Math.max(containerDimensions.height / (kVideoMinHeight * this.props.fontSize), 1)) * kGridScaleFactor;

                            this.currentLayout.forEach(entry => {
                                entry.minW = kGridScaleFactor;
                                entry.minH = kGridScaleFactor;
                            });

                            //error("Column count: %o, Row count: %o, Layout: %o", this.columnCount, this.rowCount, this.state.layout);
                            return (
                                <div
                                    className={cssStyle.spotlight + " " + cssStyle.grid}
                                    tabIndex={0}
                                >
                                    <GridLayout
                                        maxRows={this.rowCount}
                                        rowHeight={(containerDimensions.height - this.rowCount * this.props.fontSize * .5) / this.rowCount}

                                        cols={this.columnCount}
                                        width={containerDimensions.width}

                                        onLayoutChange={newLayout => {
                                            this.currentLayout = newLayout;
                                            events.fire("action_toggle_spotlight", {
                                                videoIds: newLayout.filter(entry => entry.x >= this.columnCount || entry.y >= this.rowCount).map(entry => entry.i),
                                                enabled: false,
                                                expend: false
                                            });
                                        }}

                                        layout={this.state.layout}

                                        margin={[this.props.fontSize * .5, this.props.fontSize * .5]}
                                        autoSize={false}
                                        compactType={"vertical"}

                                        resizeHandles={["ne", "nw", "se", "sw"]}
                                    >
                                        {this.state.layout.map(entry => (
                                            <div className={cssStyle.videoContainer} key={entry.i}>
                                                <ErrorBoundary>
                                                    <VideoContainer videoId={entry.i} key={entry.i} isSpotlight={true} />
                                                </ErrorBoundary>
                                            </div>
                                        ))}
                                    </GridLayout>
                                </div>
                            );
                        }}
                    </SpotlightDimensionsContext.Consumer>
                )}
            </RendererVideoEventContext.Consumer>
        );
    }

    updateBoxes(keys: string[]) {
        const deletedKeys = this.currentLayout.filter(entry => keys.indexOf(entry.i) === -1);
        const newKeys = keys.filter(entry => this.currentLayout.findIndex(el => el.i === entry) === -1);

        deletedKeys.forEach(key => this.removeBox(key.i));
        newKeys.forEach(key => this.addBox(key));
    }

    addBox(key: string) {
        const newLayout = _.cloneDeep(this.currentLayout);

        let newTile: Layout = { i: key, w: kGridScaleFactor, h: kGridScaleFactor, x: 0, y: 0 };

        calculateNewTile:
            if(newLayout.length === 0) {
                /* Trivial case */
                newTile.x = 0;
                newTile.y = 0;
                newTile.w = this.columnCount;
                newTile.h = this.rowCount;
            } else {
                /* 1. try to find an empty spot */
                {
                    let matrix = [];
                    for(let row = 0; row < this.rowCount; row++) {
                        let col = [];

                        columnLoop:
                            for(let column = 0; column < this.columnCount; column++) {
                                for(const entry of newLayout) {
                                    if(entry.x > column || column >= entry.x + entry.w) {
                                        continue;
                                    }

                                    if(entry.y > row || row >= entry.y + entry.h) {
                                        continue;
                                    }

                                    col.push(false);
                                    continue columnLoop;
                                }

                                col.push(true);
                            }

                        matrix.push(col);
                    }

                    const rectangle = largestRectangle(matrix);
                    if(rectangle && rectangle.w >= Math.floor(kGridScaleFactor / 2) && rectangle.h >= Math.floor(kGridScaleFactor / 2)) {
                        /* TODO: Try to find neighbors which have the same border length and see if they've space on the opposite site */

                        newTile.x = rectangle.x;
                        newTile.y = rectangle.y;
                        newTile.w = rectangle.w;
                        newTile.h = rectangle.h;
                        break calculateNewTile;
                    }
                }

                /* 2. No spot found. Break up a big tile into peaces */
                {
                    let biggest: Layout = newLayout[0];
                    for(const entry of newLayout) {
                        if(entry.w * entry.h > biggest.w * biggest.h) {
                            biggest = entry;
                        }
                    }

                    if(biggest.h / kVideoMinWidth * kVideoMinHeight > biggest.w) {
                        /* split it by height */
                        newTile.h = biggest.h;
                        biggest.h = Math.floor(biggest.h / 2);
                        newTile.h -= biggest.h;

                        newTile.w = biggest.w;

                        newTile.x = biggest.x;
                        newTile.y = biggest.y + biggest.h;
                    } else {
                        /* split it by width */
                        newTile.w = biggest.w;
                        biggest.w = Math.floor(biggest.w / 2);
                        newTile.w -= biggest.w;

                        newTile.h = biggest.h;

                        newTile.x = biggest.x + biggest.w;
                        newTile.y = biggest.y;
                    }
                }
            }

        newLayout.push(newTile);
        this.currentLayout = newLayout;
        this.setState({ layout: newLayout });
    }

    removeBox(key: string) {
        const newLayout = _.cloneDeep(this.currentLayout);
        const index = newLayout.findIndex(entry => entry.i === key);
        if(index === -1) {
            return;
        }

        const [ removedEntry ] = newLayout.splice(index, 1);
        for(const entry of newLayout) {
            if(removedEntry.h === entry.h && removedEntry.y === entry.y) {
                if(removedEntry.x === entry.x + entry.w) {
                    entry.w += removedEntry.w;
                } else if(removedEntry.x + removedEntry.w === entry.x) {
                    entry.x -= removedEntry.w;
                    entry.w += removedEntry.w;
                }
            } else if(removedEntry.w === entry.w && removedEntry.x === entry.x) {
                if(removedEntry.y === entry.y + entry.h) {
                    entry.h += removedEntry.h;
                } else if(removedEntry.y + removedEntry.h === entry.y) {
                    entry.y -= removedEntry.h;
                    entry.h += removedEntry.h;
                }
            }
        }

        this.currentLayout = newLayout;
        this.setState({ layout: newLayout });
    }
}

const SpotlightGrid = (props: { fontSize: number }) => {
    const refSpotlight = useRef<SpotlightGridController>();

    const events = useContext(RendererVideoEventContext);
    events.reactUse("notify_spotlight", event => refSpotlight.current?.updateBoxes(event.videoId), undefined, []);
    useMemo(() => events.fire("query_spotlight"), []);

    return (
        <SpotlightGridController fontSize={props.fontSize} ref={refSpotlight} />
    );
};

export const Spotlight = () => {
    const mode = useGlobalSetting(Settings.KEY_VIDEO_SPOTLIGHT_MODE);
    switch (mode) {
        case 1:
            return (
                <FontSizeObserver key={"key-1"}>
                    {fontSize => <SpotlightGrid fontSize={fontSize} />}
                </FontSizeObserver>
            );

        case 0:
        default:
            return <SpotlightSingle key={"key-0"} />;
    }
};