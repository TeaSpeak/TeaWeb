import * as React from "react";
import {useContext, useRef, useState} from "react";
import {Registry} from "tc-shared/events";
import {
    MusicPlaylistEntryInfo,
    MusicPlaylistStatus,
    MusicPlaylistUiEvents
} from "tc-shared/ui/frames/side/MusicPlaylistDefinitions";
import {Button} from "tc-shared/ui/react-elements/Button";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {preview_image} from "tc-shared/ui/frames/image_preview";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {copyToClipboard} from "tc-shared/utils/helpers";
import ImagePlaylistNoThumbnail from "./MusicPlaylistNoThumbnail.png";

const cssStyle = require("./MusicPlaylistRenderer.scss");

const EventContext = React.createContext<Registry<MusicPlaylistUiEvents>>(undefined);
const kPlaylistDragPrefixIds = "x-teaspeak-playlist-drag-ids-";
const kPlaylistDragSongUrl = "x-teaspeak-playlist-drag-url";

function parseDragIds(transfer: DataTransfer) : { serverUniqueId: string, entryId: number, playlistId: number } | undefined {
    for(const item of transfer.items) {
        if(!item.type.startsWith(kPlaylistDragPrefixIds)) {
            continue;
        }

        const [ handlerId, playlistIdStr, entryIdStr ] = item.type.substring(kPlaylistDragPrefixIds.length).split("-");
        return { serverUniqueId: handlerId, entryId: parseInt(entryIdStr), playlistId: parseInt(playlistIdStr) };
    }

    return undefined;
}

export function formatPlaytime(value: number) {
    if(value == 0) {
        return "--:--:--";
    }

    value /= 1000;

    let hours = 0, minutes = 0;
    while(value >= 60 * 60) {
        hours++;
        value -= 60 * 60;
    }

    while(value >= 60) {
        minutes++;
        value -= 60;
    }

    return ("0" + hours).substr(-2) + ":" + ("0" + minutes).substr(-2) + ":" + ("0" + value.toFixed(0)).substr(-2);
}

export const DefaultThumbnail = (_props: { type: "loading" | "none-present" }) => {
    return (
        <img
            draggable={false}
            src={ImagePlaylistNoThumbnail}
            alt={useTr("loading")}
        />
    );
}

const PlaylistEntry = React.memo((props: { serverUniqueId: string, playlistId: number, entryId: number, active: boolean }) => {
    const events = useContext(EventContext);
    const refContainer = useRef<HTMLDivElement>();
    const refDragLeaveTimer = useRef<number>();

    const [ insertMarker, setInsertMarker ] = useState<"above" | "bellow" | "none">("none");

    const [ status, setStatus ] = useState<MusicPlaylistEntryInfo>(() => {
        events.fire("query_entry_status", { entryId: props.entryId });
        return { type: "loading", url: undefined };
    });
    events.reactUse("notify_entry_status", event => event.entryId === props.entryId && setStatus(event.status));

    let thumbnail, firstRow: React.ReactElement | string = "", secondRow: React.ReactElement | string = "", secondRowTitle, length;
    switch (status.type) {
        case "song":
            if(status.thumbnailImage) {
                thumbnail = (
                    <img
                        draggable={false}
                        key={"song-thumbnail"}
                        src={status.thumbnailImage}
                        onClick={() => preview_image(status.thumbnailImage, status.thumbnailImage)}
                        alt={useTr("Thumbnail")}
                    />
                )
            } else {
                thumbnail = <DefaultThumbnail key={"default-none"} type={"none-present"} />;
            }
            firstRow = status.title;

            const description = status.description || tr("No song description given.");
            secondRow = description.substr(0, 100);
            secondRowTitle = description;

            length = formatPlaytime(status.length);
            break;

        case "loading":
            if(status.url) {
                secondRow = status.url;
            }

            /* fall through expected */
        default:
            thumbnail = <DefaultThumbnail key={"default"} type={"loading"} />;
            firstRow = <React.Fragment key={"loading"}><Translatable>Loading</Translatable> <LoadingDots /></React.Fragment>;
            break;
    }

    let insertClass;
    switch (insertMarker) {
        case "above":
            insertClass = cssStyle.insertMarkerAbove;
            break;

        case "bellow":
            insertClass = cssStyle.insertMarkerBellow;
            break;

        case "none":
        default:
            break;
    }

    //cssStyle.playlistEntry + " " + cssStyle.shown + " " + (props.active ? cssStyle.currentSong : "")
    return (
        <div
            ref={refContainer}
            className={joinClassList(cssStyle.playlistEntry, cssStyle.shown, props.active && cssStyle.currentSong, insertClass)}
            onContextMenu={event => {
                event.preventDefault();

                spawnContextMenu({ pageY: event.pageY, pageX: event.pageX }, [
                    {
                        type: "normal",
                        label: tr("Copy URL"),
                        click: () => { status.type === "song" ? copyToClipboard(status.url) : undefined; },
                        visible: status.type === "song"
                    },
                    {
                        type: "normal",
                        label: tr("Copy description"),
                        click: () => { status.type === "song" ? copyToClipboard(status.description) : undefined; },
                        visible: status.type === "song" && !!status.description
                    },
                    {
                        type: "normal",
                        label: tr("Remove song"),
                        click: () => events.fire("action_entry_delete", { entryId: props.entryId })
                    }
                ]);
            }}
            draggable={true}
            onDragStart={event => {
                event.dataTransfer.setData(kPlaylistDragPrefixIds + props.serverUniqueId + "-" + props.playlistId + "-" + props.entryId, "");
                if(status.type === "song") {
                    event.dataTransfer.setData(kPlaylistDragSongUrl, status.url);
                }
                event.dataTransfer.effectAllowed = "all";
            }}
            onDragOver={event => {
                const info = parseDragIds(event.dataTransfer);
                if(!info || !refContainer.current) {
                    return;
                }

                event.preventDefault();
                if(info.playlistId === props.playlistId && info.serverUniqueId === props.serverUniqueId) {
                    if(info.entryId === props.entryId) {
                        event.dataTransfer.dropEffect = "none";
                        return;
                    }

                    event.dataTransfer.dropEffect = "move";
                } else if([...event.dataTransfer.items].findIndex(item => item.type === kPlaylistDragSongUrl) !== -1) {
                    event.dataTransfer.dropEffect = "copy";
                } else {
                    event.dataTransfer.dropEffect = "none";
                    return;
                }

                if(refDragLeaveTimer.current) {
                    clearTimeout(refDragLeaveTimer.current);
                    refDragLeaveTimer.current = undefined;
                }

                const containerRect = refContainer.current.getBoundingClientRect();
                switch (insertMarker) {
                    case "bellow": {
                        const yThreshold = containerRect.y + containerRect.height * .4;
                        if(event.pageY < yThreshold) {
                            setInsertMarker("above");
                        }
                        break;
                    }

                    case "above": {
                        const yThreshold = containerRect.y + containerRect.height * .6;
                        if(event.pageY > yThreshold) {
                            setInsertMarker("bellow");
                        }
                        break;
                    }

                    case "none": {
                        const yThreshold = containerRect.y + containerRect.height / 2;
                        if(event.pageY > yThreshold) {
                            setInsertMarker("bellow");
                        } else {
                            setInsertMarker("above");
                        }
                        break;
                    }
                }

            }}
            onDragLeave={() => {
                if(refDragLeaveTimer.current) {
                    return;
                }

                /* The drag leave event might also gets fired when the component itself updates. If set set the insert marker to none it might cause flickering */
                refDragLeaveTimer.current = setTimeout(() => {
                    setInsertMarker("none");
                    refDragLeaveTimer.current = undefined;
                }, 50);
            }}
            onDragExit={() => setInsertMarker("none")}
            onDragEnd={() => setInsertMarker("none")}
            onDrop={event => {
                const info = parseDragIds(event.dataTransfer);
                if(!info) {
                    setInsertMarker("none");
                    return;
                }

                if(info.playlistId === props.playlistId && info.serverUniqueId === props.serverUniqueId) {
                    switch (insertMarker) {
                        case "above":
                            events.fire("action_reorder_song", { entryId: info.entryId, targetEntryId: props.entryId, mode: "before" });
                            break;

                        case "bellow":
                            events.fire("action_reorder_song", { entryId: info.entryId, targetEntryId: props.entryId, mode: "after" });
                            break;

                        case "none":
                        default:
                            return;
                    }
                } else {
                    const songUrl = event.dataTransfer.getData(kPlaylistDragSongUrl);
                    if(!songUrl) { return; }

                    switch (insertMarker) {
                        case "above":
                            events.fire("action_add_song", { targetEntryId: props.entryId, mode: "before", url: songUrl });
                            break;

                        case "bellow":
                            events.fire("action_add_song", { targetEntryId: props.entryId, mode: "after", url: songUrl });
                            break;

                        case "none":
                        default:
                            return;
                    }
                }

                setInsertMarker("none");
            }}
            onDoubleClick={() => events.fire("action_select_entry", { entryId: props.entryId })}
        >
            <div className={cssStyle.thumbnail}>
                {thumbnail}
            </div>
            <div className={cssStyle.data}>
                <div className={cssStyle.row}>
                    <div className={cssStyle.name}>{firstRow}</div>
                    <div className={cssStyle.delete} onClick={() => events.fire("action_entry_delete", { entryId: props.entryId })}>
                        <img src="img/icon_conversation_message_delete.svg" alt="X" />
                    </div>
                </div>

                <div className={cssStyle.row + " " + cssStyle.second}>
                    <div className={cssStyle.description} title={secondRowTitle}>{secondRow}</div>
                    <div className={cssStyle.length}>{length}</div>
                </div>
            </div>
        </div>
    );
});

export const MusicPlaylistList = (props: { events: Registry<MusicPlaylistUiEvents>, className?: string }) => {
    const [ state, setState ] = useState<MusicPlaylistStatus>(() => {
        props.events.fire("query_playlist_status");

        return {
            status: "loading"
        };
    });
    props.events.reactUse("notify_playlist_status", event => setState(event.status));

    let content;
    switch (state.status) {
        case "error":
            content = (
                <div className={cssStyle.overlay + " " + cssStyle.error} key={"error"}>
                    <a><Translatable>An error occurred while fetching the playlist:</Translatable></a>
                    <a>{state.reason}</a>

                    <Button color={"blue"} type={"small"} className={cssStyle.button} onClick={() => props.events.fire("action_load_playlist", { forced: false })}>
                        <Translatable>Reload</Translatable>
                    </Button>
                </div>
            );
            break;

        case "no-permissions":
            content = (
                <div className={cssStyle.overlay} key={"no-permissions"}>
                    <a><Translatable>You don't have permissions to see this playlist:</Translatable></a>
                    <a>
                        <Translatable>Failed on permission</Translatable>
                        <code>{state.failedPermission}</code>
                    </a>

                    <Button color={"blue"} type={"small"} className={cssStyle.button} onClick={() => props.events.fire("action_load_playlist", { forced: false })}>
                        <Translatable>Reload</Translatable>
                    </Button>
                </div>
            );
            break;

        case "unloaded":
            content = (
                <div className={cssStyle.overlay} key={"unloaded"}>
                    <a><Translatable>Playlist hasn't been loaded</Translatable></a>
                    <Button color={"blue"} type={"small"} className={cssStyle.button} onClick={() => props.events.fire("action_load_playlist", { forced: false })}>
                        <Translatable>Load playlist</Translatable>
                    </Button>
                </div>
            );
            break;

        case "loading":
            content = (
                <div className={cssStyle.overlay} key={"loading"}>
                    <a><Translatable>Fetching playlist</Translatable> <LoadingDots /></a>
                </div>
            );
            break;

        case "unselected":
            content = (
                <div className={cssStyle.overlay} key={"unselected"}>
                    <a><Translatable>Please select a playlist</Translatable></a>
                </div>
            );
            break;

        case "loaded":
            content = (
                <div className={cssStyle.playlist} key={"playlist"}>
                    {state.songs.map(songId => <PlaylistEntry entryId={songId} key={"song-" + songId} active={songId === state.activeSong} playlistId={state.playlistId} serverUniqueId={state.serverUniqueId} />)}
                </div>
            );
            break;
    }

    return (
        <EventContext.Provider value={props.events}>
            <div className={cssStyle.containerPlaylist + " " + props.className}>
                {content}
            </div>
        </EventContext.Provider>
    );
}