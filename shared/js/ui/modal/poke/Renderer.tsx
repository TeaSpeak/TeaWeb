import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext} from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {ModalPokeEvents, ModalPokeVariables, PokeRecord} from "tc-shared/ui/modal/poke/Definitions";
import {IpcRegistryDescription, Registry} from "tc-events";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import {BBCodeRenderer} from "tc-shared/text/bbcode";
import {Button} from "tc-shared/ui/react-elements/Button";
import moment from "moment";

const cssStyle = require("./Renderer.scss");

const VariablesContext = React.createContext<UiVariableConsumer<ModalPokeVariables>>(undefined);

const PokeRenderer = React.memo((props: { poke: PokeRecord }) => (
    <div className={cssStyle.entry}>
        <div className={cssStyle.date}>{moment(props.poke.timestamp).format("HH:mm:ss")}</div>&nbsp;-&nbsp;
        <ClientTag clientName={props.poke.clientName} clientUniqueId={props.poke.clientUniqueId} handlerId={props.poke.handlerId} className={cssStyle.user} />
        <div className={cssStyle.text}><Translatable>pokes you</Translatable></div>:
        <div><BBCodeRenderer message={props.poke.message} settings={{ convertSingleUrls: true }} /></div>
    </div>
))

const ServerPokeListRenderer = React.memo((props: { pokes: PokeRecord[] }) => (
    <div className={cssStyle.server}>
        <div className={cssStyle.serverName}>{props.pokes.last().serverName}</div>
        <div className={cssStyle.pokeList}>
            {props.pokes.map(entry => (
                <PokeRenderer poke={entry} key={entry.uniqueId} />
            ))}
        </div>
    </div>
));

const PokeListRenderer = React.memo(() => {
    const variables = useContext(VariablesContext);
    const pokes = variables.useReadOnly("pokeList", undefined, []);

    let serverPokes: {[key: string]: PokeRecord[]} = {};
    pokes.forEach(entry => (serverPokes[entry.serverUniqueId] || (serverPokes[entry.serverUniqueId] = [])).push(entry));

    for(const uniqueId of Object.keys(serverPokes)) {
        serverPokes[uniqueId].sort((a, b) => a.timestamp - b.timestamp);
    }

    const sortedServerUniqueIds = Object.keys(serverPokes).sort((a, b) => serverPokes[a][0].timestamp - serverPokes[b][0].timestamp);
    return (
        <div className={cssStyle.containerServers}>
            {sortedServerUniqueIds.map(serverUniqueId => (
                <ServerPokeListRenderer pokes={serverPokes[serverUniqueId]} key={serverUniqueId} />
            ))}
        </div>
    )
});

class PokeModal extends AbstractModal {
    readonly variables: UiVariableConsumer<ModalPokeVariables>;
    readonly events: Registry<ModalPokeEvents>;
    
    constructor(events: IpcRegistryDescription<ModalPokeEvents>, variables: IpcVariableDescriptor<ModalPokeVariables>) {
        super();

        this.variables = createIpcUiVariableConsumer(variables);
        this.events = Registry.fromIpcDescription(events);
    }
    
    renderBody(): React.ReactElement {
        return (
            <VariablesContext.Provider value={this.variables}>
                <div className={cssStyle.container}>
                    <PokeListRenderer />
                    <div className={cssStyle.buttons}>
                        <div className={cssStyle.spacer} />
                        <Button color={"green"} onClick={() => this.events.fire("action_close")}>
                            <Translatable>Close</Translatable>
                        </Button>
                    </div>
                </div>
            </VariablesContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>You have been poked!</Translatable>;
    }

    verticalAlignment(): "top" | "center" | "bottom" {
        return "top";
    }
}

export default PokeModal;