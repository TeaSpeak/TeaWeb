import * as React from "react";

const cssStyle = require("./ErrorBoundary.scss");

interface ErrorBoundaryState {
    errorOccurred: boolean
}

export class ErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
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
        } else {
            return this.props.children;
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        /* TODO: Some kind of logging? */
    }

    static getDerivedStateFromError() : Partial<ErrorBoundaryState> {
        return { errorOccurred: true };
    }
}