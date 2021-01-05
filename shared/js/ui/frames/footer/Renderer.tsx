import * as React from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {useEffect, useMemo, useState} from "react";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {server_connections} from "tc-shared/ConnectionManager";
import {StatusController} from "tc-shared/ui/frames/footer/StatusController";
import {ConnectionStatusEvents} from "tc-shared/ui/frames/footer/StatusDefinitions";
import {Registry} from "tc-shared/events";
import {StatusDetailRenderer, StatusEvents, StatusTextRenderer} from "tc-shared/ui/frames/footer/StatusRenderer";

const cssStyle = require("./Renderer.scss");

const VersionsRenderer = () => (
    <React.Fragment>
        <a className={cssStyle.version} key={"version"}>
            <Translatable>Version:</Translatable> {__build.version}
        </a>
        <div className={cssStyle.source} key={"link"}>
            <VariadicTranslatable text={"(Open source on {})"}>
                <a target="_blank" href="https://github.com/TeaSpeak/TeaSpeak-Web">github.com</a>
            </VariadicTranslatable>
        </div>
    </React.Fragment>
);

/* FIXME: Outsource this! */
const RtcStatus = () => {
    const statusController = useMemo(() => new StatusController(new Registry<ConnectionStatusEvents>()), []);
    statusController.setConnectionHandler(server_connections.active_connection());

    server_connections.events().reactUse("notify_active_handler_changed", event => {
        statusController.setConnectionHandler(event.newHandler);
    }, undefined, []);

    return (
        <StatusEvents.Provider value={statusController.getEvents()}>
            <StatusTextRenderer />
            <StatusDetailRenderer />
        </StatusEvents.Provider>
    )
};


export const FooterRenderer = () => {
    return (
        <div className={cssStyle.container}>
            <VersionsRenderer />
            <RtcStatus />
        </div>
    );
};