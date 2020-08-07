import * as React from "react";
import {ClientAvatar, kDefaultAvatarImage, kLoadingAvatarImage} from "tc-shared/file/Avatars";
import {useState} from "react";
import * as image_preview from "tc-shared/ui/frames/image_preview";

const ImageStyle = { height: "100%", width: "100%", cursor: "pointer" };
export const AvatarRenderer = React.memo((props: { avatar: ClientAvatar | "loading" | "default", className?: string, alt?: string }) => {
    let [ revision, setRevision ] = useState(0);

    let image;
    if(props.avatar === "loading") {
        image = <img src={kLoadingAvatarImage} />;
    } else if(props.avatar === "default") {
        image = <img src={kDefaultAvatarImage} />;
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
                        image_preview.preview_image(imageUrl, undefined);
                    }}
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
                        image_preview.preview_image(imageUrl, undefined);
                    }}
                />;
                break;

            case "errored":
                image = <img key={"error"} alt={typeof props.alt === "string" ? props.alt : tr("error")} title={tr("avatar failed to load:\n") + props.avatar.getLoadError()} src={imageUrl} style={ImageStyle} />;
                break;

            case "loading":
                image = <img key={"loading"} alt={typeof props.alt === "string" ? props.alt : tr("loading")} title={tr("loading avatar")} src={kLoadingAvatarImage} style={ImageStyle} />;
                break;

            case undefined:
                break;
        }

        props.avatar?.events.reactUse("avatar_state_changed", () => setRevision(revision + 1));
    }

    return (
        <div className={props.className} style={{ overflow: "hidden" }}>
            {image}
        </div>
    )
});