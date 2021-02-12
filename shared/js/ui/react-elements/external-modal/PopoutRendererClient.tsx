import {InternalModalContentRenderer} from "tc-shared/ui/react-elements/internal-modal/Renderer";
import {AbstractModal, ModalRenderer} from "tc-shared/ui/react-elements/ModalDefinitions";
import * as ReactDOM from "react-dom";
import * as React from "react";

export interface ModalControlFunctions {
    close();
    minimize();
}

const cssStyle = require("./PopoutRenderer.scss");
export class ClientModalRenderer implements ModalRenderer {
    private readonly functionController: ModalControlFunctions;

    private readonly titleElement: HTMLTitleElement;
    private readonly container: HTMLDivElement;
    private readonly titleChangeObserver: MutationObserver;

    private titleContainer: HTMLDivElement;
    private currentModal: AbstractModal;

    constructor(functionController: ModalControlFunctions) {
        this.functionController = functionController;

        this.container = document.createElement("div");
        this.container.classList.add(cssStyle.container);

        const titleElements = document.getElementsByTagName("title");
        if(titleElements.length === 0) {
            this.titleElement = document.createElement("title");
            document.head.appendChild(this.titleElement);
        } else {
            this.titleElement = titleElements[0];
        }

        document.body.append(this.container);

        this.titleChangeObserver = new MutationObserver(() => this.updateTitle());
    }

    renderModal(modal: AbstractModal | undefined) {
        if(this.currentModal === modal) {
            return;
        }

        this.titleChangeObserver.disconnect();
        ReactDOM.unmountComponentAtNode(this.container);

        this.currentModal = modal;
        ReactDOM.render(
            <InternalModalContentRenderer
                modal={this.currentModal}
                onClose={() => this.functionController.close()}
                onMinimize={() => this.functionController.minimize()}

                containerClass={cssStyle.container}
                headerClass={cssStyle.header}
                headerTitleClass={cssStyle.title}
                bodyClass={cssStyle.body}
            />,
            this.container,
            () => {
                this.titleContainer = this.container.querySelector("." + cssStyle.title) as HTMLDivElement;
                this.titleChangeObserver.observe(this.titleContainer, {
                    attributes: true,
                    subtree: true,
                    childList: true,
                    characterData: true
                });
                this.updateTitle();
            }
        );
    }

    private updateTitle() {
        if(!this.titleContainer) {
            return;
        }

        this.titleElement.innerText = this.titleContainer.textContent;
    }
}