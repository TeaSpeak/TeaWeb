import * as React from "react";
import {parseMessageWithArguments} from "tc-shared/ui/frames/chat";
import {cloneElement, ReactNode} from "react";

let instances = [];
export class Translatable extends React.Component<{
    children: string | (string | React.ReactElement<HTMLBRElement>)[],
    __cacheKey?: string,
    trIgnore?: boolean,
    enforceTextOnly?: boolean
}, { translated: string }> {
    protected renderElementIndex = 0;

    constructor(props) {
        super(props);

        let text;
        if(Array.isArray(this.props.children)) {
            text = (this.props.children as any[]).map(e => typeof e === "string" ? e : "\n").join("");
        } else {
            text = this.props.children;
        }

        this.state = {
            translated: /* @tr-ignore */ tr(text)
        }
    }

    render() {
        return this.state.translated.split("\n").reduce((previousValue, currentValue, currentIndex, array) => {
            previousValue.push(<React.Fragment key={++this.renderElementIndex}>{currentValue}</React.Fragment>);
            if(currentIndex + 1 !== array.length)
                previousValue.push(<br key={++this.renderElementIndex} />);
            return previousValue;
        }, []);
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

let renderBrElementIndex = 0;
export type VariadicTranslatableChild = React.ReactElement | string;
export const VariadicTranslatable = (props: { text: string, __cacheKey?: string, children?: VariadicTranslatableChild[] | VariadicTranslatableChild }) => {
    const args = Array.isArray(props.children) ? props.children : [props.children];
    const argsUseCount = [...new Array(args.length)].map(() => 0);

    const translated = /* @tr-ignore */ tr(props.text);

    return (<>
        {
            parseMessageWithArguments(translated, args.length).map(e => {
                if(typeof e === "string") {
                    return e.split("\n").reduce((result, element) => {
                        if(result.length > 0) {
                            result.push(<br key={++this.renderBrElementIndex}/>);
                        }
                        result.push(element);
                        return result;
                    }, []);
                }

                let element = args[e];
                if(argsUseCount[e]) {
                    if(typeof element === "string") {
                        /* do nothing */
                    } else {
                        element = cloneElement(element);
                    }
                }
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