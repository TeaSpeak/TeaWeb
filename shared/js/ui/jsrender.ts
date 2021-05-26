import * as loader from "tc-loader";
import moment from "moment";
import {LogCategory, logError, logTrace} from "../log";
import {tr} from "tc-shared/i18n/localize";
import TemplateFile from "../../html/templates.html";
import TemplateMusicManage from "../../html/templates/modal/musicmanage.html";
import TemplateNewComer from "../../html/templates/modal/newcomer.html";

function initializeHtml(html: string) {
    const hangingPoint = document.getElementById("templates");

    const node = document.createElement("html");
    node.innerHTML = html;
    for(const element of node.getElementsByClassName("jsrender-template")) {
        if(!$.templates(element.id, element.innerHTML)) {
            logError(LogCategory.GENERAL, tr("Failed to setup cache for js renderer template %s!"), element.id);
        } else {
            logTrace(LogCategory.GENERAL, tr("Successfully loaded jsrender template %s"), element.id);

            const elem = document.createElement("div");
            elem.id = element.id;
            hangingPoint?.appendChild(elem);        }
    }
}

export function setupJSRender() : boolean {
    if(!$.views) {
        loader.critical_error("Missing jsrender viewer extension!");
        return false;
    }

    $.views.settings.allowCode(true);
    $.views.tags("rnd", (argument) => {
        let min = parseInt(argument.substr(0, argument.indexOf('~')));
        let max = parseInt(argument.substr(argument.indexOf('~') + 1));

        return (Math.round(Math.random() * (min + max + 1) - min)).toString();
    });

    $.views.tags("fmt_date", (...args) => {
        return moment(args[0]).format(args[1]);
    });

    $.views.tags("tr", (...args) => {
        return /* @tr-ignore */ tr(args[0]);
    });

    initializeHtml(TemplateFile);
    initializeHtml(TemplateMusicManage);
    initializeHtml(TemplateNewComer);
    return true;
}