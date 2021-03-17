import * as React from "react";
import {useEffect, useState} from "react";
import {ClientAvatar, kDefaultAvatarImage, kLoadingAvatarImage} from "tc-shared/file/Avatars";
import * as image_preview from "tc-shared/ui/frames/ImagePreview";

const ImageStyle = { height: "100%", width: "100%", cursor: "pointer" };
export const AvatarRenderer = React.memo((props: { avatar: ClientAvatar | "loading" | "default", className?: string, alt?: string }) => {
    let [ revision, setRevision ] = useState(0);

    let image;
    let avatar: ClientAvatar;
    if(props.avatar === "loading") {
        image = <img draggable={false} src={kLoadingAvatarImage} alt={tr("loading")}/>;
    } else if(props.avatar === "default") {
        image = <img draggable={false} src={kDefaultAvatarImage} alt={tr("default avatar")} />;
    } else {
        const imageUrl = props.avatar.getAvatarUrl();
        switch (props.avatar.getState()) {
            case "unset":
                image = <img
                    key={"default"}
                    title={tr("default avatar")}
                    alt={typeof props.alt === "string" ? props.alt : tr("default avatar")}
                    src={props.avatar.getAvatarUrl()}
                    style={ImageStyle}
                    onClick={event => {
                        if(event.isDefaultPrevented())
                            return;

                        event.preventDefault();
                        image_preview.showImagePreview(imageUrl, undefined);
                    }}
                    draggable={false}
                />;
                break;

            case "loaded":
                image = <img
                    key={"user-" + props.avatar.getAvatarHash()}
                    alt={typeof props.alt === "string" ? props.alt : tr("user avatar")}
                    title={tr("user avatar")}
                    src={imageUrl}
                    style={ImageStyle}
                    onClick={event => {
                        if(event.isDefaultPrevented())
                            return;

                        event.preventDefault();
                        image_preview.showImagePreview(imageUrl, undefined);
                    }}
                    draggable={false}
                />;
                break;

            case "errored":
                image = <img draggable={false} key={"error"} alt={typeof props.alt === "string" ? props.alt : tr("error")} title={tr("avatar failed to load:\n") + props.avatar.getLoadError()} src={imageUrl} style={ImageStyle} />;
                break;

            case "loading":
                image = <img draggable={false} key={"loading"} alt={typeof props.alt === "string" ? props.alt : tr("loading")} title={tr("loading avatar")} src={kLoadingAvatarImage} style={ImageStyle} />;
                break;

            case undefined:
                break;
        }

        avatar = props.avatar;
    }

    useEffect(() => avatar && avatar.events.on("avatar_state_changed", () => setRevision(revision + 1)), [ props.avatar ]);

    return (
        <div className={props.className} style={{ overflow: "hidden" }}>
            {image}
        </div>
    )
});