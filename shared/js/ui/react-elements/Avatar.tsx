import * as React from "react";
import {ClientAvatar} from "tc-shared/file/Avatars";
import {useState} from "react";

const ImageStyle = { height: "100%", width: "100%" };
export const AvatarRenderer = (props: { avatar: ClientAvatar, className?: string }) => {
    let [ revision, setRevision ] = useState(0);

    let image;
    switch (props.avatar.state) {
        case "unset":
            image = <img key={"default"} title={tr("default avatar")} alt={tr("default avatar")} src={props.avatar.avatarUrl} style={ImageStyle} />;
            break;

        case "loaded":
            image = <img key={"user-" + props.avatar.currentAvatarHash} alt={tr("user avatar")} title={tr("user avatar")} src={props.avatar.avatarUrl} style={ImageStyle} />;
            break;

        case "errored":
            image = <img key={"error"} alt={tr("error")} title={tr("avatar failed to load:\n") + props.avatar.loadError} src={props.avatar.avatarUrl} style={ImageStyle} />;
            break;

        case "loading":
            image = <img key={"loading"} alt={tr("loading")} title={tr("loading avatar")} src={"img/loading_image.svg"} style={ImageStyle} />;
            break;
    }

    props.avatar.events.reactUse("avatar_state_changed", () => setRevision(revision + 1));

    return (
        <div className={props.className} style={{ overflow: "hidden" }}>
            {image}
        </div>
    )
};