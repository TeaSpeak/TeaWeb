import * as React from "react";
import * as purify from "dompurify";

export class HTMLRenderer extends React.PureComponent<{ purify: boolean, children: string }, {}> {
    private readonly reference = React.createRef<HTMLSpanElement>();
    private readonly newNodes: Element[];
    private originalNode: HTMLSpanElement;

    constructor(props) {
        super(props);

        const html = this.props.purify ? purify.sanitize(this.props.children) : this.props.children;
        const node = document.createElement("div");
        node.innerHTML = html;

        this.newNodes = [...node.children];
    }

    render() {
        if(this.newNodes.length === 0)
            return null;

        return <span ref={this.reference} />;
    }

    componentDidMount(): void {
        if(this.newNodes.length === 0)
            return;

        this.originalNode = this.reference.current;

        this.originalNode.replaceWith(this.newNodes[0]);
        this.newNodes.forEach((node, index, array) => {
            if(index === 0) return;

            node.after(array[index - 1]);
        });
    }

    componentWillUnmount(): void {
        if(this.newNodes.length === 0)
            return;

        this.newNodes.forEach((node, index) => {
            if(index === 0) return;

            node.remove();
        });

        this.newNodes[0].replaceWith(this.originalNode);
    }
}