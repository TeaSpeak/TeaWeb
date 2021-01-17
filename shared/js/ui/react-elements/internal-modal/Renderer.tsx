import * as React from "react";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";
import {ClientIcon} from "svg-sprites/client-icons";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {useMemo} from "react";

const cssStyle = require("./Modal.scss");

export const InternalModalContentRenderer = React.memo((props: {
    modal: AbstractModal,

    onClose?: () => void,
    onMinimize?: () => void,

    containerClass?: string,
    headerClass?: string,
    headerTitleClass?: string,
    bodyClass?: string,

    refContent?: React.Ref<HTMLDivElement>
}) => {
    const body = useMemo(() => props.modal.renderBody(), [props.modal]);
    const title = useMemo(() => props.modal.renderTitle(), [props.modal]);

    return (
        <div className={cssStyle.content + " " + props.containerClass} ref={props.refContent}>
            <div className={cssStyle.header + " " + props.headerClass}>
                <div className={cssStyle.icon}>
                    <img src="img/favicon/teacup.png"  alt={tr("Modal - Icon")} />
                </div>
                <div className={cssStyle.title + " " + props.headerTitleClass}>
                    <ErrorBoundary>
                        {title}
                    </ErrorBoundary>
                </div>
                {!props.onMinimize ? undefined : (
                    <div className={cssStyle.button} onClick={props.onMinimize}>
                        <div className={"icon_em " + ClientIcon.MinimizeButton} />
                    </div>
                )}
                {!props.onClose ? undefined : (
                    <div className={cssStyle.button} onClick={props.onClose}>
                        <div className={"icon_em " + ClientIcon.CloseButton} />
                    </div>
                )}
            </div>
            <div className={cssStyle.body + " " + props.bodyClass}>
                <ErrorBoundary>
                    {body}
                </ErrorBoundary>
            </div>
        </div>
    );
});

export class InternalModalRenderer extends React.PureComponent<{ modal: AbstractModal, onClose: () => void }, { show: boolean }> {
    private readonly refModal = React.createRef<HTMLDivElement>();

    constructor(props) {
        super(props);

        this.state = { show: false };
    }

    render() {
        let modalExtraClass = "";

        const type = this.props.modal.type();
        if(typeof type === "string" && type !== "none") {
            modalExtraClass = cssStyle["modal-type-" + type];
        }

        const showClass = this.state.show ? cssStyle.shown : "";
        return (
            <div
                className={cssStyle.modal + " " + modalExtraClass + " " + showClass + " " + cssStyle["align-" + this.props.modal.verticalAlignment()]}
                tabIndex={-1}
                role={"dialog"}
                aria-hidden={true}
                onClick={event => this.onBackdropClick(event)}
                ref={this.refModal}
            >
                <div className={cssStyle.dialog}>
                    <InternalModalContentRenderer
                        modal={this.props.modal}
                        onClose={this.props.onClose}

                        containerClass={cssStyle.contentInternal}
                        bodyClass={cssStyle.body + " " + cssStyle["modal-" + this.props.modal.color()]}
                    />
                </div>
            </div>
        );
    }

    private onBackdropClick(event: React.MouseEvent) {
        if(event.target !== this.refModal.current || event.isDefaultPrevented())
            return;

        this.props.onClose();
    }
}