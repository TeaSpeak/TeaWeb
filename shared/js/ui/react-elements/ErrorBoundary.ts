import * as React from "react";

interface ErrorBoundaryState {
    errorOccurred: boolean
}

export class ErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
    render() {
        if(this.state.errorOccurred) {

        } else {
            return this.props.children;
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Did catch: %o - %o", error, errorInfo);
    }

    static getDerivedStateFromError() : Partial<ErrorBoundaryState> {
        return { errorOccurred: true };
    }
}