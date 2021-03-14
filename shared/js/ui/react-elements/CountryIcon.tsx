import * as i18n from "tc-shared/i18n/country";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import * as React from "react";

const cssStyle = require("./CountryIcon.scss");

export const CountryIcon = (props: { country: string, className?: string }) => {
    const country = props.country || "xx";
    return (
        <div className={joinClassList(cssStyle.countryContainer, props.className)}>
            <div className={"country flag-" + country} />
            {i18n.country_name(country, useTr("Global"))}
        </div>
    )
};