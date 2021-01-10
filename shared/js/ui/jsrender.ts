import * as loader from "tc-loader";
import * as moment from "moment";
import {LogCategory, logError, logTrace} from "../log";
import {tr} from "tc-shared/i18n/localize";

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

    $(".jsrender-template").each((idx, _entry) => {
        if(!$.templates(_entry.id, _entry.innerHTML)) {
            logError(LogCategory.GENERAL, tr("Failed to setup cache for js renderer template %s!"), _entry.id);
        } else
            logTrace(LogCategory.GENERAL, tr("Successfully loaded jsrender template %s"), _entry.id);
    });
    return true;
}