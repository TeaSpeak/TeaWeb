import "core-js/stable";
import "./polifill";
import "./css";

import {ApplicationLoader} from "./loader/loader";
import {getUrlParameter} from "./loader/Utils";

/* let the loader register himself at the window first */
const target = getUrlParameter("loader-target") || "app";
console.info("Loading app with loader \"%s\"", target);

let appLoader: ApplicationLoader;
if(target === "empty") {
    appLoader = new (require("./targets/empty").default);
} else if(target === "manifest") {
    appLoader = new (require("./targets/maifest-target").default);
} else {
    appLoader = new (require("./targets/app").default);
}
setTimeout(() => appLoader.execute(), 0);

export {};

if(__build.target === "client") {
    /* do this so we don't get a react dev tools warning within the client */
    if(!('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window)) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    }

    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () {};
}

/* Hello World message */
{
    const clog = console.log;
    const print_security = () => {
        {
            const css = [
                "display: block",
                "text-align: center",
                "font-size: 42px",
                "font-weight: bold",
                "-webkit-text-stroke: 2px black",
                "color: red"
            ].join(";");
            clog("%c ", "font-size: 100px;");
            clog("%cSecurity warning:", css);
        }
        {
            const css = [
                "display: block",
                "text-align: center",
                "font-size: 18px",
                "font-weight: bold"
            ].join(";");

            clog("%cPasting anything in here could give attackers access to your data.", css);
            clog("%cUnless you understand exactly what you are doing, close this window and stay safe.", css);
            clog("%c ", "font-size: 100px;");
        }
    };

    /* print the hello world */
    {
        const css = [
            "display: block",
            "text-align: center",
            "font-size: 72px",
            "font-weight: bold",
            "-webkit-text-stroke: 2px black",
            "color: #18BC9C"
        ].join(";");
        clog("%cHey, hold on!", css);
    }
    {
        const css = [
            "display: block",
            "text-align: center",
            "font-size: 26px",
            "font-weight: bold"
        ].join(";");

        const css_2 = [
            "display: block",
            "text-align: center",
            "font-size: 26px",
            "font-weight: bold",
            "color: blue"
        ].join(";");

        const display_detect = /./;
        display_detect.toString = function() { print_security(); return ""; };

        clog("%cLovely to see you using and debugging the TeaSpeak-Web client.", css);
        clog("%cIf you have some good ideas or already done some incredible changes,", css);
        clog("%cyou'll be may interested to share them here: %chttps://github.com/TeaSpeak/TeaWeb", css, css_2);
        clog("%c ", display_detect);
    }
}