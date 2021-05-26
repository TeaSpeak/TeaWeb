import * as React from "react";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {getCountryFlag, getCountryName} from "../../i18n/CountryFlag";

const cssStyle = require("./CountryIcon.scss");

export const CountryCode = (props: { alphaCode: string, className?: string }) => {
    return (
        <div className={joinClassList(cssStyle.countryContainer, props.className)}>
            <div className={"flag_em " + getCountryFlag(props.alphaCode) + " " + cssStyle.icon} />
            {getCountryName(props.alphaCode, useTr("Global"))}
        </div>
    )
};