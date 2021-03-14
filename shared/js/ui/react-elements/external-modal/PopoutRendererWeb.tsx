import * as React from "react";
import * as ReactDOM from "react-dom";
import {AbstractModal, ModalRenderer} from "tc-shared/ui/react-elements/ModalDefinitions";

const cssStyle = require("./PopoutRenderer.scss");

class TitleRenderer {
    private readonly htmlContainer: HTMLElement;
    private modalInstance: AbstractModal;

    constructor() {
        const titleElements = document.getElementsByTagName("title");
        if(titleElements.length === 0) {
            this.htmlContainer = document.createElement("title");
            document.head.appendChild(this.htmlContainer);
        } else {
            this.htmlContainer = titleElements[0];
        }
    }

    setInstance(instance: AbstractModal) {
        if(this.modalInstance) {
            ReactDOM.unmountComponentAtNode(this.htmlContainer);
        }

        this.modalInstance = instance;
        if(this.modalInstance) {
            ReactDOM.render(<>{this.modalInstance.renderTitle()}</>, this.htmlContainer);
        }
    }
}

class BodyRenderer {
    private readonly htmlContainer: HTMLElement;
    private modalInstance: AbstractModal;

    constructor() {
        this.htmlContainer = document.createElement("div");
        this.htmlContainer.classList.add(cssStyle.container);

        document.body.appendChild(this.htmlContainer);
    }

    setInstance(instance: AbstractModal) {
        if(this.modalInstance) {
            ReactDOM.unmountComponentAtNode(this.htmlContainer);
        }

        this.modalInstance = instance;
        if(this.modalInstance) {
            ReactDOM.render(<>{this.modalInstance.renderBody({ windowed: true })}</>, this.htmlContainer);
        }
    }
}

export class WebModalRenderer implements ModalRenderer {
    private readonly titleRenderer: TitleRenderer;
    private readonly bodyRenderer: BodyRenderer;

    private currentModal: AbstractModal;

    constructor() {
        this.titleRenderer = new TitleRenderer();
        this.bodyRenderer = new BodyRenderer();
    }

    renderModal(modal: AbstractModal | undefined) {
        if(this.currentModal === modal) {
            return;
        }

        this.currentModal = modal;
        this.titleRenderer.setInstance(modal);
        this.bodyRenderer.setInstance(modal);
    }
}