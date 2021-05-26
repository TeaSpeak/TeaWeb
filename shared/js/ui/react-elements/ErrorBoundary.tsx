import * as React from "react";

const cssStyle = require("./ErrorBoundary.scss");

interface ErrorBoundaryState {
    errorOccurred: boolean
}

export class ErrorBoundary extends React.PureComponent<{}, ErrorBoundaryState> {
    constructor(props) {
        super(props);

        this.state = { errorOccurred: false };
    }
    render() {
        if(this.state.errorOccurred) {
            return (
                <div className={cssStyle.container}>
                    <div className={cssStyle.text}>A rendering error has occurred</div>
                </div>
            );
        } else if(typeof this.props.children !== "undefined") {
            return this.props.children;
        } else {
            return null;
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        /* TODO: Some kind of logging? */
        console.error(error);
    }

    static getDerivedStateFromError() : Partial<ErrorBoundaryState> {
        return { errorOccurred: true };
    }
}