import {
    ChannelDescriptionStatus,
    ChannelDescriptionUiEvents
} from "tc-shared/ui/frames/side/ChannelDescriptionDefinitions";
import {Registry} from "tc-shared/events";
import * as React from "react";
import {useState} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {BBCodeRenderer} from "tc-shared/text/bbcode";

const cssStyle = require("./ChannelDescriptionRenderer.scss");

const CenteredTextRenderer = (props: { children?: React.ReactElement | (React.ReactElement | string)[], className?: string }) => {
    return (
        <div className={cssStyle.container + " " + cssStyle.centeredText + " " + props.className}>
            <div className={cssStyle.text}>
                {props.children}
            </div>
        </div>
    );
}

const DescriptionRenderer = React.memo((props: { description: string, handlerId: string }) => {
    if(!props.description) {
        return (
            <CenteredTextRenderer key={"no-description"}>
                <Translatable>Channel has no description</Translatable>
            </CenteredTextRenderer>
        )
    }

    return (
        <div key={"description"} className={cssStyle.descriptionContainer}>
            <BBCodeRenderer settings={{ convertSingleUrls: false }} message={props.description} handlerId={props.handlerId} />
        </div>
    )
});

const DescriptionErrorRenderer = React.memo((props: { error: string }) => (
    <CenteredTextRenderer className={cssStyle.error}>
        <Translatable>An error happened while fetching the channel description:</Translatable><br />
        {props.error}
    </CenteredTextRenderer>
));

const PermissionErrorRenderer = React.memo((props: { failedPermission: string }) => (
    <CenteredTextRenderer>
        <Translatable>You don't have the permission to watch the channel description.</Translatable>&nbsp;
        <VariadicTranslatable text={"(Missing permission {})"}><code>{props.failedPermission}</code></VariadicTranslatable>
    </CenteredTextRenderer>
));

export const ChannelDescriptionRenderer = React.memo((props: { events: Registry<ChannelDescriptionUiEvents> }) => {
    const [ description, setDescription ] = useState<ChannelDescriptionStatus | { status: "loading" }>(() => {
        props.events.fire("query_description");
        return { status: "loading" };
    });
    props.events.reactUse("notify_description", event => setDescription(event.status));

    switch (description.status) {
        case "success":
            return (
                <DescriptionRenderer description={description.description} key={"description"} handlerId={description.handlerId} />
            );

        case "error":
            return (
                <DescriptionErrorRenderer error={description.reason} key={"error"} />
            );

        case "no-permissions":
            return (
                <PermissionErrorRenderer failedPermission={description.failedPermission} />
            );

        case "loading":
        default:
            return (
                <CenteredTextRenderer key={"loading"}>
                    <Translatable>loading channel description</Translatable> <LoadingDots />
                </CenteredTextRenderer>
            );
    }
});