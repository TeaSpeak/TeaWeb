import * as React from "react";
import * as ReactDOM from "react-dom";

import {AbstractModal} from "tc-shared/ui/react-elements/Modal";

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
        if(this.modalInstance)
            ReactDOM.unmountComponentAtNode(this.htmlContainer);
        this.modalInstance = instance;
        if(this.modalInstance)
            ReactDOM.render(<>{this.modalInstance.title()}</>, this.htmlContainer);
    }
}
export const titleRenderer = new TitleRenderer();

class BodyRenderer {
    private readonly htmlContainer: HTMLElement;
    private modalInstance: AbstractModal;

    constructor() {
        this.htmlContainer = document.createElement("div");
        this.htmlContainer.classList.add(cssStyle.container);

        document.body.appendChild(this.htmlContainer);
    }

    setInstance(instance: AbstractModal) {
        if(this.modalInstance)
            ReactDOM.unmountComponentAtNode(this.htmlContainer);
        this.modalInstance = instance;
        if(this.modalInstance)
            ReactDOM.render(<>{this.modalInstance.renderBody()}</>, this.htmlContainer);
    }
}
export const bodyRenderer = new BodyRenderer();