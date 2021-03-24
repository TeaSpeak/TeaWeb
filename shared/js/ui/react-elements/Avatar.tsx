import * as React from "react";
import {useState} from "react";
import {ClientAvatar, kDefaultAvatarImage, kLoadingAvatarImage} from "tc-shared/file/Avatars";
import {useTr} from "tc-shared/ui/react-elements/Helper";
import {showImagePreview} from "tc-shared/ui/frames/ImagePreview";

const ImageStyle = { height: "100%", width: "100%", cursor: "pointer" };

const AvatarLoadingImage = React.memo((props: { alt?: string }) => (
    <img
        draggable={false}
        alt={typeof props.alt === "string" ? props.alt : tr("loading")}
        title={useTr("loading avatar")}
        src={kLoadingAvatarImage}
        style={ImageStyle}
    />
));

const AvatarDefaultImage = React.memo((props: { className?: string, alt?: string }) => (
    <img
        draggable={false}
        src={kDefaultAvatarImage}
        style={ImageStyle}
        alt={typeof props.alt === "string" ? props.alt : tr("default avatar")}
        color={props.className}
        onClick={event => {
            if(event.isDefaultPrevented()) {
                return;
            }

            event.preventDefault();
            showImagePreview(kDefaultAvatarImage, kDefaultAvatarImage);
        }}
    />
));

const ClientAvatarRenderer = React.memo((props: { avatar: ClientAvatar, className?: string, alt?: string }) => {
    const [ , setRevision ] = useState(0);

    let image;
    switch (props.avatar.getState()) {
        case "unset":
            image = (
                <AvatarDefaultImage key={"default"} />
            );
            break;

        case "loading":
            image = (
                <AvatarLoadingImage key={"loading"} />
            );
            break;

        case "loaded":
            const imageUrl = props.avatar.getAvatarUrl();
            image = (
                <img
                    key={"user-" + props.avatar.getAvatarHash()}
                    alt={typeof props.alt === "string" ? props.alt : tr("user avatar")}
                    title={tr("user avatar")}
                    src={imageUrl}
                    style={ImageStyle}
                    onClick={event => {
                        if(event.isDefaultPrevented()) {
                            return;
                        }

                        event.preventDefault();
                        showImagePreview(imageUrl, undefined);
                    }}
                    draggable={false}
                />
            );
            break;

        case "errored":
            image = (
                <img
                    draggable={false}
                    key={"error"}
                    alt={typeof props.alt === "string" ? props.alt : tr("error")}
                    title={tr("avatar failed to load:\n") + props.avatar.getLoadError()}
                    style={ImageStyle}
                />
            );
            break;

        case undefined:
            break;
    }

    props.avatar.events.reactUse("avatar_state_changed", () => {
        setRevision(performance.now());
    }, undefined, []);

    return image;
});

export const AvatarRenderer = React.memo((props: { avatar: ClientAvatar | "loading" | "default", className?: string, alt?: string }) => {
    let body;
    if(props.avatar === "loading") {
        body = (
            <AvatarLoadingImage key={"loading"} {...props} />
        );
    } else if(props.avatar === "default") {
        body = (
            <AvatarDefaultImage key={"default"} {...props} />
        );
    } else if(props.avatar instanceof ClientAvatar) {
        body = (
            <ClientAvatarRenderer key={"user-avatar"} avatar={props.avatar} className={props.className} alt={props.alt} />
        );
    }

    return (
        <div className={props.className} style={{ overflow: "hidden" }}>
            {body}
        </div>
    );
});