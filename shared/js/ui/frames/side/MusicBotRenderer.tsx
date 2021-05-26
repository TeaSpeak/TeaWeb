import {Registry} from "tc-shared/events";
import {MusicPlaylistUiEvents} from "tc-shared/ui/frames/side/MusicPlaylistDefinitions";
import {DefaultThumbnail, formatPlaytime, MusicPlaylistList} from "tc-shared/ui/frames/side/MusicPlaylistRenderer";
import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {
    MusicBotPlayerState,
    MusicBotPlayerTimestamp,
    MusicBotSongInfo,
    MusicBotUiEvents
} from "tc-shared/ui/frames/side/MusicBotDefinitions";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {showImagePreview} from "tc-shared/ui/frames/ImagePreview";
import {Slider} from "tc-shared/ui/react-elements/Slider";

const cssStyle = require("./MusicBotRenderer.scss");

const EventContext = React.createContext<Registry<MusicBotUiEvents>>(undefined);
const SongInfoContext = React.createContext<MusicBotSongInfo>(undefined);
const TimestampContext = React.createContext<MusicBotPlayerTimestamp & { seekOffset: number | undefined }>(undefined);

const ButtonRewind = () => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         viewBox="0 0 512 512" xmlSpace="preserve">
        <path transform="rotate(180, 256, 256)" d="M504.171,239.489l-234.667-192c-6.357-5.227-15.189-6.293-22.656-2.773c-7.424,3.541-12.181,11.051-12.181,19.285v146.987
                L34.837,47.489c-6.379-5.227-15.189-6.293-22.656-2.773C4.757,48.257,0,55.767,0,64.001v384c0,8.235,4.757,15.744,12.181,19.285
                c2.923,1.365,6.059,2.048,9.152,2.048c4.843,0,9.621-1.643,13.504-4.821l199.829-163.499v146.987
                c0,8.235,4.757,15.744,12.181,19.285c2.923,1.365,6.059,2.048,9.152,2.048c4.843,0,9.621-1.643,13.504-4.821l234.667-192
                c4.949-4.053,7.829-10.112,7.829-16.512S509.12,243.543,504.171,239.489z"/>
    </svg>
);

const ButtonPlay = () => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         viewBox="0 0 512 512" xmlSpace="preserve">
        <path d="M500.203,236.907L30.869,2.24c-6.613-3.285-14.443-2.944-20.736,0.939C3.84,7.083,0,13.931,0,21.333v469.333
                                            c0,7.403,3.84,14.251,10.133,18.155c3.413,2.112,7.296,3.179,11.2,3.179c3.264,0,6.528-0.747,9.536-2.24l469.333-234.667
                                            C507.435,271.467,512,264.085,512,256S507.435,240.533,500.203,236.907z"/>
    </svg>
);

const ButtonPause = () => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         viewBox="0 0 512 512" xmlSpace="preserve">
        <path transform='rotate(90, 256, 256)' d="M85.333,213.333h341.333C473.728,213.333,512,175.061,512,128s-38.272-85.333-85.333-85.333H85.333
                                        C38.272,42.667,0,80.939,0,128S38.272,213.333,85.333,213.333z"/>
        <path transform='rotate(90, 256, 256)' d="M426.667,298.667H85.333C38.272,298.667,0,336.939,0,384s38.272,85.333,85.333,85.333h341.333
                                        C473.728,469.333,512,431.061,512,384S473.728,298.667,426.667,298.667z"/>
    </svg>
);

const ButtonForward = () => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         viewBox="0 0 512 512" xmlSpace="preserve">
        <path d="M504.171,239.489l-234.667-192c-6.357-5.227-15.189-6.293-22.656-2.773c-7.424,3.541-12.181,11.051-12.181,19.285v146.987
                L34.837,47.489c-6.379-5.227-15.189-6.293-22.656-2.773C4.757,48.257,0,55.767,0,64.001v384c0,8.235,4.757,15.744,12.181,19.285
                c2.923,1.365,6.059,2.048,9.152,2.048c4.843,0,9.621-1.643,13.504-4.821l199.829-163.499v146.987
                c0,8.235,4.757,15.744,12.181,19.285c2.923,1.365,6.059,2.048,9.152,2.048c4.843,0,9.621-1.643,13.504-4.821l234.667-192
                c4.949-4.053,7.829-10.112,7.829-16.512S509.12,243.543,504.171,239.489z"/>
    </svg>
);

const ButtonVolume = () => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         width="93.038px" height="93.038px" viewBox="0 0 93.038 93.038"
         xmlSpace="preserve">
        <path d="M46.547,75.521c0,1.639-0.947,3.128-2.429,3.823c-0.573,0.271-1.187,0.402-1.797,0.402c-0.966,0-1.923-0.332-2.696-0.973
            l-23.098-19.14H4.225C1.892,59.635,0,57.742,0,55.409V38.576c0-2.334,1.892-4.226,4.225-4.226h12.303l23.098-19.14
            c1.262-1.046,3.012-1.269,4.493-0.569c1.481,0.695,2.429,2.185,2.429,3.823L46.547,75.521L46.547,75.521z M62.784,68.919
            c-0.103,0.007-0.202,0.011-0.304,0.011c-1.116,0-2.192-0.441-2.987-1.237l-0.565-0.567c-1.482-1.479-1.656-3.822-0.408-5.504
            c3.164-4.266,4.834-9.323,4.834-14.628c0-5.706-1.896-11.058-5.484-15.478c-1.366-1.68-1.24-4.12,0.291-5.65l0.564-0.565
            c0.844-0.844,1.975-1.304,3.199-1.231c1.192,0.06,2.305,0.621,3.061,1.545c4.977,6.09,7.606,13.484,7.606,21.38
            c0,7.354-2.325,14.354-6.725,20.24C65.131,68.216,64.007,68.832,62.784,68.919z M80.252,81.976
            c-0.764,0.903-1.869,1.445-3.052,1.495c-0.058,0.002-0.117,0.004-0.177,0.004c-1.119,0-2.193-0.442-2.988-1.237l-0.555-0.555
            c-1.551-1.55-1.656-4.029-0.246-5.707c6.814-8.104,10.568-18.396,10.568-28.982c0-11.011-4.019-21.611-11.314-29.847
            c-1.479-1.672-1.404-4.203,0.17-5.783l0.554-0.555c0.822-0.826,1.89-1.281,3.115-1.242c1.163,0.033,2.263,0.547,3.036,1.417
            c8.818,9.928,13.675,22.718,13.675,36.01C93.04,59.783,88.499,72.207,80.252,81.976z"/>
    </svg>
);

const SongInfoProvider = (props) => {
    const events = useContext(EventContext);
    const [ info, setInfo ] = useState<MusicBotSongInfo>(() => {
        events.fire("query_song_info");
        return { type: "none" };
    });
    events.reactUse("notify_song_info", event => setInfo(event.info));

    return (
        <SongInfoContext.Provider value={info}>
            {props.children}
        </SongInfoContext.Provider>
    );
};

const PlayerTimestampProvider = (props) => {
    const events = useContext(EventContext);
    const [ timestamp, setTimestamp ] = useState<MusicBotPlayerTimestamp>(() => {
        events.fire("query_player_timestamp");
        return {
            seekable: false,
            bufferOffset: 0,
            playOffset: 0,
            base: 0,
            total: 0,
        };
    });
    const [ seekOffset, setSeekOffset ] = useState<number | undefined>(undefined);

    events.reactUse("notify_player_timestamp", event => setTimestamp(event.timestamp), undefined, []);
    events.reactUse("notify_player_seek_timestamp", event => {
        if(event.applySeek && timestamp.base > 0 && typeof seekOffset === "number") {
            timestamp.playOffset = seekOffset;
            timestamp.bufferOffset += Date.now() - timestamp.base;
            timestamp.base = Date.now();
        }
        setSeekOffset(event.offset);
    }, undefined, [ seekOffset, timestamp ]);

    return (
        <TimestampContext.Provider value={Object.assign({ seekOffset: seekOffset }, timestamp)}>
            {props.children}
        </TimestampContext.Provider>
    )
}

const Thumbnail = React.memo(() => {
    const info = useContext(SongInfoContext);

    let thumbnail;
    switch (info.type) {
        case "none":
            thumbnail = <DefaultThumbnail type={"none-present"} key={"none"} />;
            break;

        case "loading":
            thumbnail = <DefaultThumbnail type={"loading"} key={"loading"} />;
            break;

        case "song":
            if(info.thumbnail) {
                thumbnail = (
                    <img
                        draggable={false}
                        key={"song-thumbnail"}
                        src={info.thumbnail}
                        onClick={() => showImagePreview(info.thumbnail, info.thumbnail)}
                        alt={tr("Thumbnail")}
                        style={{ cursor: "pointer" }}
                    />
                );
            } else {
                thumbnail = <DefaultThumbnail type={"none-present"} key={"none"} />;
            }
            break;
    }
    return (
        <div className={cssStyle.thumbnail}>
            {thumbnail}
        </div>
    );
});

const Timestamps = () => {
    const info = useContext(TimestampContext);

    const [ revision, setRevision ] = useState(0);
    useEffect(() => {
        const id = setTimeout(() => setRevision(revision + 1), 990);
        return () => clearTimeout(id);
    });

    let current: number;
    if(info.seekable && typeof info.seekOffset === "number") {
        current = info.seekOffset;
    } else {
        const timePassed = info.base > 0 ? Date.now() - info.base : 0;
        current = info.playOffset + timePassed;
    }

    return (
        <div className={cssStyle.timestamps}>
            <div>{formatPlaytime(current)}</div>
            <div>{formatPlaytime(info.total)}</div>
        </div>
    );
}

const Timeline = () => {
    const events = useContext(EventContext);
    const info = useContext(TimestampContext);
    const refContainer = useRef<HTMLDivElement>();
    const [ moveActive, setMoveActive ] = useState(false);

    useEffect(() => {
        if(!moveActive) {
            return;
        }

        document.body.classList.add(cssStyle.bodySeek);

        let currentSeekOffset;
        const mouseMoveListener = (event: MouseEvent) => {
            if(!refContainer.current) {
                return;
            }

            const { x, width } = refContainer.current.getBoundingClientRect();
            if(event.pageX <= x) {
                events.fire("notify_player_seek_timestamp", { offset: currentSeekOffset = 0, applySeek: false });
            } else if(event.pageX >= x + width) {
                events.fire("notify_player_seek_timestamp", { offset: currentSeekOffset = info.total, applySeek: false });
            } else {
                events.fire("notify_player_seek_timestamp", { offset: currentSeekOffset = Math.floor((event.pageX - x) / width * info.total), applySeek: false });
            }
        };

        const mouseUpListener = () => {
            if(typeof currentSeekOffset === "number") {
                events.fire("action_seek_to", { target: currentSeekOffset });
            }
            events.fire("notify_player_seek_timestamp", { offset: undefined, applySeek: true });
            setMoveActive(false);
        }

        document.addEventListener("mousemove", mouseMoveListener);
        document.addEventListener("mouseleave", mouseUpListener);
        document.addEventListener("mouseup", mouseUpListener);
        document.addEventListener("focusout", mouseUpListener);

        return () => {
            document.body.classList.remove(cssStyle.bodySeek);

            document.removeEventListener("mousemove", mouseMoveListener);
            document.removeEventListener("mouseleave", mouseUpListener);
            document.removeEventListener("mouseup", mouseUpListener);
            document.removeEventListener("focusout", mouseUpListener);
        };
    }, [ moveActive ]);

    let current: number, buffered: number;

    const timePassed = info.base > 0 ? Date.now() - info.base : 0;
    if(info.seekable && typeof info.seekOffset === "number") {
        current = info.seekOffset;
    } else {
        current = info.playOffset + timePassed;
    }
    buffered = info.bufferOffset + timePassed;

    let widthBuffered = info.total === 0 ? 100 : (buffered / info.total) * 100;
    let widthCurrent = info.total === 0 ? 100 : (current / info.total) * 100;

    return (
        <div className={cssStyle.timeline} ref={refContainer}>
            <div className={cssStyle.indicator + " " + cssStyle.buffered} style={{ width: widthBuffered.toFixed(2) + "%"}} />
            <div className={cssStyle.indicator + " " + cssStyle.playtime} style={{ width: widthCurrent.toFixed(2) + "%"}} />
            <div
                className={cssStyle.thumb}
                style={{ marginLeft: widthCurrent.toFixed(2) + "%"}}
                onMouseDown={() => info.seekable && info.total > 0 && setMoveActive(true)}
            >
                <div className={cssStyle.dot} />
            </div>
        </div>
    );
}

const SongInfo = () => {
    const info = useContext(SongInfoContext);

    let name, nameTitle/*, description */;
    switch (info.type) {
        case "none":
            name = <Translatable key={"no-song"}>No song selected</Translatable>;
            break;

        case "song":
            name = info.title || info.url;
            nameTitle = name;
            /* description = info.description; */
            break;

        case "loading":
            name = info.url;
            nameTitle = name;
            break;
    }

    return (
        <div className={cssStyle.containerSongInfo}>
            <a className={cssStyle.songName} title={nameTitle}>{name}</a>
            {/* <a className={cssStyle.songDescription}>{description}</a> */}
        </div>
    );
}

const ControlButtons = () => {
    const events = useContext(EventContext);
    const [ playerState, setPlayerState ] = useState<MusicBotPlayerState>(() => {
        events.fire("query_player_state");
        return "paused";
    });
    events.reactUse("notify_player_state", event => setPlayerState(event.state));

    let playButton;
    if(playerState === "paused") {
        playButton = (
            <div className={cssStyle.controlButton} key={"play"} onClick={() => events.fire("action_player_action", { action: "play" })}>
                <ButtonPlay />
            </div>
        );
    } else {
        playButton = (
            <div className={cssStyle.controlButton} key={"pause"} onClick={() => events.fire("action_player_action", { action: "pause" })}>
                <ButtonPause />
            </div>
        );
    }

    return (
        <div className={cssStyle.controlButtons}>
            <div className={cssStyle.controlButton} onClick={() => events.fire("action_player_action", { action: "rewind" })}>
                <ButtonRewind />
            </div>
            {playButton}
            <div className={cssStyle.controlButton} onClick={() => events.fire("action_player_action", { action: "forward" })}>
                <ButtonForward />
            </div>
        </div>
    );
}

const VolumeSlider = (props: { mode: "local" | "remote", }) => {
    const events = useContext(EventContext);
    const refSlider = useRef<Slider>();

    const [ value, setValue ] = useState(() => {
        events.fire("query_volume", { mode: props.mode });
        return 100;
    });
    events.reactUse("notify_volume", event => {
        if(event.mode !== props.mode) {
            return;
        }

        setValue(event.volume * 100);
        if(!refSlider.current?.state.active) {
            refSlider.current?.setState({ value: event.volume * 100 });
        }
    });

    let name;
    if(props.mode === "local") {
        name = <Translatable key={"local"}>Local</Translatable>;
    } else {
        name = <Translatable key={"remote"}>Remote</Translatable>;
    }

    const valueString = (value: number) => {
        if(value > 100) {
            return "+" + (value - 100).toFixed(0);
        } else if(value == 100) {
            return "±0";
        } else {
            return "-" + (100 - value).toFixed(0);
        }
    }

    return (
        <div className={cssStyle.containerSlider}>
            <div className={cssStyle.name}>{name} (<a>{valueString(value)}</a>%):</div>
            <Slider
                ref={refSlider}
                minValue={0}
                maxValue={200}
                stepSize={1}
                value={value}
                className={cssStyle.slider}
                onInput={value => {
                    setValue(value);
                    if(props.mode === "local") {
                        events.fire("action_change_volume", { mode: props.mode, volume: value / 100 });
                    }
                }}
                onChange={value => {
                    setValue(value);
                    events.fire("action_change_volume", { mode: props.mode, volume: value / 100 });
                }}
                tooltip={value => valueString(value) + "%"}
            />
        </div>
    );
}

const VolumeSetting = () => {
    const events = useContext(EventContext);
    const [ expended, setExpended ] = useState(false);
    events.reactUse("notify_bot_changed", () => setExpended(false));

    return (
        <div className={cssStyle.volumeOverlay + " " + (expended ? cssStyle.expended : "")}>
            <div className={cssStyle.controlButton} onClick={() => setExpended(!expended)}>
                <ButtonVolume />
            </div>
            <div className={cssStyle.content}>
                <VolumeSlider mode={"local"} />
                <VolumeSlider mode={"remote"} />
            </div>
        </div>
    );
}

const MusicBotPlayer = () => {
    return (
        <div className={cssStyle.player}>
            <SongInfoProvider>
                <div className={cssStyle.containerThumbnail}>
                    <Thumbnail />
                </div>
                <SongInfo />
            </SongInfoProvider>
            <PlayerTimestampProvider>
                <div className={cssStyle.containerTimeline}>
                    <Timestamps />
                    <Timeline />
                </div>
            </PlayerTimestampProvider>
            <div className={cssStyle.containerControl}>
                <ControlButtons />
                <VolumeSetting />
            </div>
        </div>
    );
}

export const MusicBotRenderer = (props: {
    botEvents: Registry<MusicBotUiEvents>,
    playlistEvents: Registry<MusicPlaylistUiEvents>
}) => {

    return (
        <EventContext.Provider value={props.botEvents}>
            <div className={cssStyle.container} draggable={false}>
                <MusicBotPlayer />
                <MusicPlaylistList events={props.playlistEvents} className={cssStyle.playlist} />
            </div>
        </EventContext.Provider>
    );
}