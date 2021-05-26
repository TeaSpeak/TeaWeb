import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalYesNoEvents, ModalYesNoVariables} from "tc-shared/ui/modal/yes-no/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer} from "tc-shared/ui/utils/IpcVariable";
import React from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/react-elements/Button";
const cssStyle = require("./Renderer.scss");

const QuestionRenderer = React.memo((props: { variables: UiVariableConsumer<ModalYesNoVariables> }) => {
    const question = props.variables.useReadOnly("question", undefined, undefined);
    return (
        <div className={cssStyle.question}>
            {question}
        </div>
    );
});

const TitleRenderer = React.memo((props: { variables: UiVariableConsumer<ModalYesNoVariables> }) => {
    const title = props.variables.useReadOnly("title", undefined, undefined);
    if(typeof title !== "undefined") {
        return <React.Fragment key={"loaded"}>{title}</React.Fragment>;
    } else {
        return <Translatable key={"loading"}>loading</Translatable>;
    }
});

const TextYes = React.memo((props: { variables: UiVariableConsumer<ModalYesNoVariables> }) => {
    const text = props.variables.useReadOnly("textYes", undefined, undefined);
    if(typeof text !== "undefined") {
        return <React.Fragment key={"custom"}>{text}</React.Fragment>;
    } else {
        return <Translatable key={"default"}>Yes</Translatable>;
    }
});

const TextNo = React.memo((props: { variables: UiVariableConsumer<ModalYesNoVariables> }) => {
    const text = props.variables.useReadOnly("textNo", undefined, undefined);
    if(typeof text !== "undefined") {
        return <React.Fragment key={"custom"}>{text}</React.Fragment>;
    } else {
        return <Translatable key={"default"}>No</Translatable>;
    }
});

class Modal extends AbstractModal {
    private readonly events: Registry<ModalYesNoEvents>;
    private readonly variables: UiVariableConsumer<ModalYesNoVariables>;

    constructor(events: IpcRegistryDescription<ModalYesNoEvents>, variables: IpcRegistryDescription<ModalYesNoVariables>) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
        this.variables.destroy();
    }

    color(): "none" | "blue" | "red" {
        return "red";
    }

    renderBody(): React.ReactElement {
        return (
            <div className={cssStyle.container}>
                <QuestionRenderer variables={this.variables} />
                <div className={cssStyle.buttons}>
                    <Button color={"red"} onClick={() => this.events.fire("action_submit", { status: false })}>
                        <TextNo variables={this.variables} />
                    </Button>
                    <Button color={"green"} onClick={() => this.events.fire("action_submit", { status: true })}>
                        <TextYes variables={this.variables} />
                    </Button>
                </div>
            </div>
        );
    }

    renderTitle(): string | React.ReactElement {
        return (
            <TitleRenderer variables={this.variables} />
        );
    }
}

export default Modal;