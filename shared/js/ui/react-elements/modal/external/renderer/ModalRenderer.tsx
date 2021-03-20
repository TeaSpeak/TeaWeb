import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {
    ModalBodyRenderer, ModalFrameRenderer,
    ModalFrameTopRenderer,
    WindowModalRenderer
} from "tc-shared/ui/react-elements/modal/Renderer";

import "./ModalRenderer.scss";

export interface ModalControlFunctions {
    close();
    minimize();
}

export class ModalRenderer {
    private readonly functionController: ModalControlFunctions;
    private readonly container: HTMLDivElement;

    constructor(functionController: ModalControlFunctions) {
        this.functionController = functionController;

        this.container = document.createElement("div");
        document.body.appendChild(this.container);
    }

    renderModal(modal: AbstractModal | undefined) {
        if(typeof modal === "undefined") {
            ReactDOM.unmountComponentAtNode(this.container);
            return;
        }

        if(__build.target === "client") {
            ReactDOM.render(
                <ModalFrameRenderer windowed={true}>
                    <ModalFrameTopRenderer
                        replacePageTitle={true}
                        modalInstance={modal}

                        onClose={() => this.functionController.close()}
                        onMinimize={() => this.functionController.minimize()}
                    />
                    <ModalBodyRenderer modalInstance={modal} />
                </ModalFrameRenderer>,
                this.container
            );
        } else {
            ReactDOM.render(
                <WindowModalRenderer>
                    <ModalFrameTopRenderer
                        replacePageTitle={true}
                        modalInstance={modal}

                        onClose={() => this.functionController.close()}
                        onMinimize={() => this.functionController.minimize()}
                    />
                    <ModalBodyRenderer modalInstance={modal} />
                </WindowModalRenderer>,
                this.container
            );
        }
    }
}