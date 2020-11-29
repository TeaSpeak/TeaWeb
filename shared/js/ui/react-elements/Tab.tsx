import * as React from "react";

const cssStyle = require("./Tab.scss");

export class TabEntry extends React.Component<{
    children: [React.ReactNode, React.ReactNode],

    id: string,
}, {}> {
    constructor(props) {
        super(props);
    }

    render() : React.ReactNode {
        throw tr("the TabEntry isn't for render purposes");
    }
}

export class Tab extends React.PureComponent<{
    children: React.ReactElement[],

    defaultTab: string;
    selectedTab?: string;

    /* permanent render all body parts (defaults to true) */
    permanentRender?: boolean,

    className?: string
}, {
    selectedTab: string
}> {
    constructor(props) {
        super(props);

        this.state = { selectedTab: this.props.defaultTab };
    }

    render() {
        this.props.children?.forEach((child, index) => {
            if(!(child.type === TabEntry)) {
                throw tra("Child {} isn't of type TabEntry", index);
            }
        });

        const selectedTab = this.props.selectedTab || this.state.selectedTab;
        return (
            <div className={cssStyle.container + " " + this.props.className}>
                <div className={cssStyle.categories}>
                    {this.props.children?.map(child => {
                        return (
                            <div
                                className={cssStyle.entry + " " + (child.props.id === selectedTab ? cssStyle.selected : "")}
                                key={child.props.id}
                                onClick={() => !this.props.selectedTab && this.setState({ selectedTab: child.props.id })}
                            >
                                {child.props.children[0]}
                            </div>
                        )
                    })}
                </div>
                <div className={cssStyle.bodies}>
                    {this.props.children?.filter(child => typeof this.props.permanentRender !== "boolean" || this.props.permanentRender || child.props.id === selectedTab).map(child => {
                        return (
                            <div className={cssStyle.body + " " + (child.props.id === selectedTab ? "" : cssStyle.hidden)} key={child.props.id}>
                                {child.props.children[1]}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }
}