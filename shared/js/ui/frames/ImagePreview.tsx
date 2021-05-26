import * as loader from "tc-loader";
import React from "react";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import ReactDOM from "react-dom";

const cssStyle = require("./ImagePreview.scss");

const imagePreviewInstance = React.createRef<ImagePreview>();
class ImagePreview extends React.PureComponent<{}, {
    imageUrl: string | undefined,
    targetUrl: string | undefined
}> {
    constructor(props) {
        super(props);

        this.state = { targetUrl: undefined, imageUrl: undefined };
    }

    render() {
        return (
            <div
                className={joinClassList(cssStyle.overlay, (!this.state.imageUrl ? cssStyle.hidden : undefined))}
                onClick={event => {
                    if(event.isDefaultPrevented()) {
                        return;
                    }

                    this.closePreview()
                }}
            >
                <div className={cssStyle.containerMenuBar}>
                    <div
                        className={cssStyle.entry}
                        onClick={() => {
                            const win = window.open(this.state.targetUrl, '_blank');
                            win.focus();
                        }}
                    >
                        <ClientIconRenderer icon={ClientIcon.ImagePreviewBrowse} />
                    </div>
                    <div
                        className={cssStyle.entry}
                         onClick={() => this.closePreview()}
                    >
                        <ClientIconRenderer icon={ClientIcon.CloseButton} />
                    </div>
                </div>
                <div className={cssStyle.containerImage}>
                    <img src={this.state.imageUrl} title={this.state.targetUrl} alt={null} />
                </div>
            </div>
        )
    }

    closePreview() {
        this.setState({ imageUrl: undefined, targetUrl: undefined });
    }
}

export const ImagePreviewHook = React.memo(() => {
    return <ImagePreview ref={imagePreviewInstance} />;
})

export function showImagePreview(url: string, originalUrl: string) {
    imagePreviewInstance.current?.setState({
        imageUrl: url,
        targetUrl: originalUrl
    });
}

export function isImagePreviewAvailable() {
    return !!imagePreviewInstance.current;
}

export function closeImagePreview() {
    imagePreviewInstance.current?.closePreview();
}