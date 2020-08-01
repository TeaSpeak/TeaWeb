import {Translatable, VariadicTranslatable} from "../../../shared/js/ui/react-elements/i18n";
import * as React from "react";

function test() {
    const element_0 = <Translatable>Hello World</Translatable>;
    const element_1 = <Translatable>{"Hello World"}</Translatable>;
    const element_2 = <VariadicTranslatable text={"XXX"}><>XXX</></VariadicTranslatable>;
}