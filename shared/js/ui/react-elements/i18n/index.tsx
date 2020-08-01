import * as React from "react";
import {parseMessageWithArguments} from "tc-shared/ui/frames/chat";
import {cloneElement} from "react";

let instances = [];
export class Translatable extends React.Component<{ children: string, __cacheKey?: string, trIgnore?: boolean }, { translated: string }> {
    constructor(props) {
        super(props);

        this.state = {
            translated: /* @tr-ignore */ tr(typeof this.props.children === "string" ? this.props.children : (this.props as any).message)
        }
    }

    render() {
        return this.state.translated;
    }

    componentDidMount(): void {
        instances.push(this);
    }

    componentWillUnmount(): void {
        const index = instances.indexOf(this);
        if(index === -1) {
            /* TODO: Log warning */
            return;
        }

        instances.splice(index, 1);
    }
}

export const VariadicTranslatable = (props: { text: string, __cacheKey?: string, children?: React.ReactElement[] | React.ReactElement }) => {
    const args = Array.isArray(props.children) ? props.children : [props.children];
    const argsUseCount = [...new Array(args.length)].map(() => 0);

    const translated = /* @tr-ignore */ tr(props.text);

    return (<>
        {
            parseMessageWithArguments(translated, args.length).map(e => {
                if(typeof e === "string")
                    return e;

                let element = args[e];
                if(argsUseCount[e])
                    element = cloneElement(element);
                argsUseCount[e]++;

                return <React.Fragment key={"argument-" + e + "-" + argsUseCount[e]}>{element}</React.Fragment>;
            })
        }
    </>);
};


declare global {
    interface Window {
        i18nInstances: Translatable[];
    }
}

window.i18nInstances = instances;