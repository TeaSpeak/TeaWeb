import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React from "react";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
import TeaCupImage from "./TeaCup.png";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {ClientIcon} from "svg-sprites/client-icons";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";

const cssStyle = require("./Renderer.scss");

export class ModalFrameTopRenderer extends React.PureComponent<{
    modalInstance: AbstractModal,

    className?: string,

    onClose?: () => void,
    onPopout?: () => void,
    onMinimize?: () => void,

    replacePageTitle: boolean,
}> {
    private readonly refTitle = React.createRef<HTMLDivElement>();
    private titleElement: HTMLTitleElement;
    private observer: MutationObserver;

    componentDidMount() {
        if(this.props.replacePageTitle) {
            const titleElements = document.getElementsByTagName("title");
            if(titleElements.length === 0) {
                this.titleElement = document.createElement("title");
                document.head.appendChild(this.titleElement);
            } else {
                this.titleElement = titleElements[0];
            }

            this.observer = new MutationObserver(() => this.updatePageTitle());
            this.observer.observe(this.refTitle.current, {
                attributes: true,
                subtree: true,
                childList: true,
                characterData: true
            });
            this.updatePageTitle();
        }
    }

    componentWillUnmount() {
        this.observer?.disconnect();
        this.observer = undefined;
        this.titleElement = undefined;
    }

    render() {
        const buttons = [];
        if(this.props.onMinimize) {
            buttons.push(
                <div className={cssStyle.button} onClick={this.props.onMinimize} key={"button-minimize"}>
                    <ClientIconRenderer icon={ClientIcon.MinimizeButton} />
                </div>
            );
        }

        if(this.props.onPopout) {
            buttons.push(
                <div className={cssStyle.button} onClick={this.props.onPopout} key={"button-popout"}>
                    <ClientIconRenderer icon={ClientIcon.ChannelPopout} />
                </div>
            );
        }

        if(this.props.onClose) {
            buttons.push(
                <div className={cssStyle.button} onClick={this.props.onClose} key={"button-close"}>
                    <ClientIconRenderer icon={ClientIcon.CloseButton} />
                </div>
            );
        }

        return (
            <div className={joinClassList(cssStyle.modalTitle, this.props.className)}>
                <div className={cssStyle.icon}>
                    <img src={TeaCupImage} alt={""} draggable={false} />
                </div>
                <div className={cssStyle.title} ref={this.refTitle}>
                    <ErrorBoundary>
                        {this.props.modalInstance.renderTitle()}
                    </ErrorBoundary>
                </div>
                {buttons}
            </div>
        );
    }

    private updatePageTitle() {
        if(!this.refTitle.current) {
            return;
        }

        this.titleElement.innerText = this.refTitle.current.textContent;
    }
}


export class ModalBodyRenderer extends React.PureComponent<{
    modalInstance: AbstractModal,
    className?: string
}> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className={joinClassList(
                cssStyle.modalBody,
                this.props.className,
                cssStyle["color-" + this.props.modalInstance.color()]
            )}>
                {this.props.modalInstance.renderBody()}
            </div>
        )
    }
}

export class ModalFrameRenderer extends React.PureComponent<{
    children: [React.ReactElement<ModalFrameTopRenderer>, React.ReactElement<ModalBodyRenderer>]
}> {
    render() {
        return (
            <div className={cssStyle.modalFrame}>
                {this.props.children[0]}
                {this.props.children[1]}
            </div>
        );
    }
}

export class PageModalRenderer extends React.PureComponent<{
    modalInstance: AbstractModal,
    onBackdropClicked: () => void,
    children: React.ReactElement<ModalFrameRenderer>
}, {
    shown: boolean
}> {
    constructor(props) {
        super(props);

        this.state = {
            shown: false
        };
    }

    render() {
        return (
            <div
                className={joinClassList(
                    cssStyle.modalPageContainer,
                    cssStyle["align-" + this.props.modalInstance.verticalAlignment()],
                    this.state.shown ? cssStyle.shown : undefined
                )}
                tabIndex={-1}
                role={"dialog"}
                aria-hidden={true}
                onClick={event => {
                    if(event.target !== event.currentTarget) {
                        return;
                    }

                    this.props.onBackdropClicked();
                }}
            >
                <div className={cssStyle.dialog}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}

export const WindowModalRenderer = (props: {
    children: [React.ReactElement<ModalFrameTopRenderer>, React.ReactElement<ModalBodyRenderer>]
}) => {
    return (
        <div className={cssStyle.modalWindowContainer}>
            {props.children[0]}
            {props.children[1]}
        </div>
    );
}