import * as React from "react";
import * as dompurify from "dompurify";
import {useState} from "react";
import {ChangeLog, ChangeLogEntry, ChangeSet} from "tc-shared/update/ChangeLog";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {guid} from "tc-shared/crypto/uid";

const { Remarkable } = require("remarkable");
const cssStyle = require("./Renderer.scss");

const mdRenderer = new Remarkable();
const brElementUuid = guid();

export interface DisplayableChangeList extends ChangeLog {
    title: React.ReactElement<Translatable>;
    url: string;
}

mdRenderer.renderer.rules.link_open = function (tokens, idx, options /*, env */) {
    const title = tokens[idx].title ? (`title="${tokens[idx].title}"`) : '';
    const target = options.linkTarget ? (`target="${options.linkTarget}"`) : '';

    let href = `<a href="${tokens[idx].href}" ${title} ${target} ></a>`;
    href = dompurify.sanitize(href);
    if(href.substr(-4) !== "</a>")
        return "<-- invalid link open... -->";
    return href.substr(0, href.length - 4);
};

const ChangeSetRenderer = (props: { set: ChangeSet }) => {
    return (
        <React.Fragment>
            {props.set.title ? <li key={"title"}>{props.set.title}</li> : undefined}
            <ul>
                {props.set.changes.map((change, index) => typeof change === "string" ? <li key={index} dangerouslySetInnerHTML={{
                    __html: mdRenderer.renderInline(change.replace(/\n/g, brElementUuid)).replace(new RegExp(brElementUuid, "g"), "<br />")
                }} /> : <ChangeSetRenderer set={change} key={index} />)}
            </ul>
        </React.Fragment>
    );
};

const ChangeLogEntryRenderer = React.memo((props: { entry: ChangeLogEntry }) => (
    <li>
        <b>{props.entry.timestamp}</b>
        <ChangeSetRenderer set={props.entry} />
    </li>
));

const DisplayableChangeListRenderer = (props: { list: DisplayableChangeList | undefined, visible: boolean }) => (
    <div className={cssStyle.body + " " + (!props.visible ? cssStyle.hidden : "")}>
        <div className={cssStyle.changeList}>
            <ul>
                {props.list?.changes.map((value, index) => <ChangeLogEntryRenderer entry={value} key={index} />)}
            </ul>
        </div>
        <div className={cssStyle.containerBrowse}>
            <a href={props.list?.url} target={"_blank"}><Translatable>Open full Change Log</Translatable></a>
        </div>
    </div>
);

const ChangeListRenderer = (props: { left?: DisplayableChangeList, right?: DisplayableChangeList, defaultSelected: "right" | "left" | "none" }) => {
    const [ selected, setSelected ] = useState<"left" | "right" | "none">(props.defaultSelected);

    return (
        <div className={cssStyle.changes}>
            <div className={cssStyle.header + " " + (selected === "left" ? cssStyle.selectedLeft : selected === "right" ? cssStyle.selectedRight : "")}>
                <div className={cssStyle.left + " " + (props.left ? "" : cssStyle.hidden)} onClick={() => setSelected("left")}>
                    <a>{props.left?.title}</a>
                </div>
                <div className={cssStyle.right + " " + (props.right ? "" : cssStyle.hidden)} onClick={() => setSelected("right")}>
                    <a>{props.right?.title}</a>
                </div>
            </div>
            <DisplayableChangeListRenderer list={props.left} visible={selected === "left"} />
            <DisplayableChangeListRenderer list={props.right} visible={selected === "right"} />
        </div>
    )
};

export const WhatsNew = (props: { changesUI?: ChangeLog, changesClient?: ChangeLog }) => {
    let subtitleLong, infoText;

    let changesUI = props.changesUI ? Object.assign({
        title: <Translatable>UI Change Log</Translatable>,
        url: "https://github.com/TeaSpeak/TeaWeb/blob/master/ChangeLog.md"
    }, props.changesUI) : undefined;

    let changesClient = props.changesClient ? Object.assign({
        title: <Translatable>Client Change Log</Translatable>,
        url: "https://github.com/TeaSpeak/TeaClient/blob/master/ChangeLog.txt"
    }, props.changesClient) : undefined;

    let versionUIDate = props.changesUI?.currentVersion, versionNativeDate = props.changesClient?.currentVersion;
    if(__build.target === "web") {
        subtitleLong = <Translatable key={"sub-web"}>We've successfully updated the web client for you.</Translatable>;
        infoText = <VariadicTranslatable key={"info-web"} text={"The web client has been updated to the version from {}."}>{versionUIDate}</VariadicTranslatable>;
    } else if(props.changesUI && props.changesClient) {
        subtitleLong = <Translatable key={"sub-native-client-ui"}>We've successfully updated the native client and its UI for you.</Translatable>;
        infoText = (
            <React.Fragment key={"info-native-client-ui"}>
                <VariadicTranslatable text={"The native client has been updated to the version from {}."}>{versionNativeDate}</VariadicTranslatable>
                <VariadicTranslatable text={"Its UI has been updated to the version {}."}>{versionUIDate}</VariadicTranslatable>
            </React.Fragment>
        );
    } else if(props.changesClient) {
        subtitleLong = <Translatable key={"sub-native-client"}>We've successfully updated the native client for you.</Translatable>;
        infoText = <VariadicTranslatable key={"info-native-client"} text={"The native client has been updated to the version {}."}>{versionNativeDate}</VariadicTranslatable>;
    } else if(props.changesUI) {
        subtitleLong = <Translatable key={"sub-native-ui"}>We've successfully updated the native clients UI for you.</Translatable>;
        infoText = <VariadicTranslatable key={"info-native-ui"} text={"The native clients UI has been updated to the version from 18.08.2020."}>{versionUIDate}</VariadicTranslatable>;
    }

    const changes = [ changesUI, changesClient ].filter(e => !!e);
    return (
        <div className={cssStyle.container}>
            <div className={cssStyle.info}>
                <div className={cssStyle.logo}>
                    <img alt={tr("TeaSpeak logo")} src="img/teaspeak_cup_animated.png" />
                </div>
                <div className={cssStyle.text}>
                    <h1><Translatable>Welcome back!</Translatable></h1>
                    <h2 className={cssStyle.subtitleLong}>{subtitleLong}</h2>
                    <h2 className={cssStyle.subtitleShort}><Translatable>The client has been updated.</Translatable></h2>
                    <p>
                        <Translatable>While you've been away resting, we did some work.</Translatable> <br />
                        {infoText} <br />
                        <Translatable>A list of changes, bugfixes and new features can be found bellow.</Translatable>
                    </p>
                    <a><Translatable>Enjoy!</Translatable></a>
                </div>
            </div>
            <ChangeListRenderer
                defaultSelected={"right"}
                right={changes[0]}
                left={changes[1]}
            />
        </div>
    );
};
