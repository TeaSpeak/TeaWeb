import {Settings, settings} from "../settings";
import { tr } from "tc-shared/i18n/localize";

export enum ColloquialFormat {
    YESTERDAY,
    TODAY,
    GENERAL
}

function dateEqual(a: Date, b: Date) {
    return  a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate();
}

export function same_day(a: number | Date, b: number | Date) {
    a = a instanceof Date ? a : new Date(a);
    b = b instanceof Date ? b : new Date(b);

    if(a.getDate() !== b.getDate())
        return false;
    if(a.getMonth() !== b.getMonth())
        return false;
    return a.getFullYear() === b.getFullYear();
}

export function date_format(date: Date, now: Date, ignore_settings?: boolean) : ColloquialFormat {
    if(!ignore_settings && !settings.static_global(Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS))
        return ColloquialFormat.GENERAL;

    if(dateEqual(date, now))
        return ColloquialFormat.TODAY;

    date = new Date(date.getTime());
    date.setDate(date.getDate() + 1);

    if(dateEqual(date, now))
        return ColloquialFormat.YESTERDAY;

    return ColloquialFormat.GENERAL;
}

export function formatDayTime(date: Date) {
    return ("0" + date.getHours()).substr(-2) + ":" + ("0" + date.getMinutes()).substr(-2);
}

export function format_date_general(date: Date, hours?: boolean) : string {
    return ('00' + date.getDate()).substr(-2) + "."
        + ('00' + date.getMonth()).substr(-2) + "."
        + date.getFullYear() +
        (typeof(hours) === "undefined" || hours ? " at "
            + ('00' + date.getHours()).substr(-2) + ":"
            + ('00' + date.getMinutes()).substr(-2)
            : "");
}

export function format_date_colloquial(date: Date, current_timestamp: Date) : { result: string; format: ColloquialFormat } {
    const format = date_format(date, current_timestamp);
    if(format == ColloquialFormat.GENERAL) {
        return {
            result: format_date_general(date),
            format: format
        };
    } else {
        let hrs = date.getHours();
        let time = "AM";
        if(hrs > 12) {
            hrs -= 12;
            time = "PM";
        }
        return {
            result: (format == ColloquialFormat.YESTERDAY ? tr("Yesterday at") : tr("Today at")) + " " + ("0" + hrs).substr(-2) + ":" + ("0" + date.getMinutes()).substr(-2) + " " + time,
            format: format
        };
    }
}

export function format_chat_time(date: Date) : {
    result: string,
    next_update: number /* in MS */
} {
    const timestamp = date.getTime();
    const current_timestamp = new Date();

    const result = {
        result: "",
        next_update: 0
    };

    if(settings.static_global(Settings.KEY_CHAT_FIXED_TIMESTAMPS)) {
        const format = format_date_colloquial(date, current_timestamp);
        result.result = format.result;
        result.next_update = 0; /* TODO: Update on day change? */
    } else {
        const delta = current_timestamp.getTime() - timestamp;
        if(delta < 2000) {
            result.result = "now";
            result.next_update = 2500 - delta; /* update after two seconds */
        } else if(delta < 30000) { /* 30 seconds */
            result.result = Math.floor(delta / 1000) + " " + tr("seconds ago");
            result.next_update = 1000; /* update every second */
        } else if(delta < 30 * 60 * 1000) { /* 30 minutes */
            if(delta < 120 * 1000)
                result.result = tr("one minute ago");
            else
                result.result = Math.floor(delta / (1000 * 60)) + " " + tr("minutes ago");
            result.next_update = 60000; /* updater after a minute */
        } else {
            result.result = format_date_colloquial(date, current_timestamp).result;
            result.next_update = 0; /* TODO: Update on day change? */
        }
    }

    return result;
}