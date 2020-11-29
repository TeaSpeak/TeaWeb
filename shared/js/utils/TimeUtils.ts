import { tr } from "tc-shared/i18n/localize";

export function format_online_time(secs: number) : string {
    let years   = Math.floor(secs  / (60 * 60 * 24 * 365));
    let days    = Math.floor(secs  / (60 * 60 * 24)) % 365;
    let hours   = Math.floor(secs / (60 * 60)) % 24;
    let minutes = Math.floor(secs / 60) % 60;
    let seconds = Math.floor(secs % 60);

    let result = "";
    if(years > 0)
        result += years + " " + tr("years") + " ";
    if(years > 0 || days > 0)
        result += days + " " + tr("days") + " ";
    if(years > 0 || days > 0 || hours > 0)
        result += hours + " " + tr("hours") + " ";
    if(years > 0 || days > 0 || hours > 0 || minutes > 0)
        result += minutes + " " + tr("minutes") + " ";
    if(years > 0 || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
        result += seconds + " " + tr("seconds") + " ";
    else
        result = tr("now") + " ";

    return result.substr(0, result.length - 1);
}