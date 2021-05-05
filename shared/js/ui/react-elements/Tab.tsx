import * as React from "react";
import {tra} from "tc-shared/i18n/localize";
import {joinClassList} from "tc-shared/ui/react-elements/Helper";

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

    /* permanent render all body parts (defaults to true) */
    permanentRender?: boolean,

    className?: string,
    bodyClassName?: string
} & ({
    /* Controlled by the component itself */
    defaultTab: string,
    onChange?: (newTab: string) => void
} | {
    /* Controlled via the parent */
    selectedTab: string,
    onChange: (newTab: string) => void
}), {
    selectedTab: string
}> {
    constructor(props) {
        super(props);

        if('defaultTab' in this.props) {
            this.state = { selectedTab: this.props.defaultTab };
        }
    }

    private getSelectedTab() : string {
        if('defaultTab' in this.props) {
            return this.state.selectedTab;
        } else {
            return this.props.selectedTab;
        }
    }

    private setSelectedTab(newTab: string) {
        if(this.getSelectedTab() === newTab) {
            return;
        }

        if('defaultTab' in this.props) {
            this.setState({ selectedTab: newTab });
        }

        if(this.props.onChange) {
            this.props.onChange(newTab);
        }
    }

    render() {
        this.props.children?.forEach((child, index) => {
            if(!(child.type === TabEntry)) {
                throw tra("Child {} isn't of type TabEntry", index);
            }
        });

        const selectedTab = this.getSelectedTab();
        return (
            <div className={cssStyle.container + " " + this.props.className}>
                <div className={cssStyle.categories}>
                    {this.props.children?.map(child => {
                        return (
                            <div
                                className={cssStyle.entry + " " + (child.props.id === selectedTab ? cssStyle.selected : "")}
                                key={child.props.id}
                                onClick={() => this.setSelectedTab(child.props.id)}
                            >
                                {child.props.children[0]}
                            </div>
                        )
                    })}
                </div>
                <div className={joinClassList(cssStyle.bodies, this.props.bodyClassName)}>
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