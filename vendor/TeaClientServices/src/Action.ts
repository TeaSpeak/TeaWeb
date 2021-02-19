import {MessageCommandErrorResult} from "./Messages";
import {clientServiceLogger} from "./Logging";

export type ActionResult<T> = {
    unwrap() : T;
} & ({
    status: "success",
    result: T
} | {
    status: "error",
    result: MessageCommandErrorResult
});


export function createErrorResult<T>(result: MessageCommandErrorResult) : ActionResult<T> {
    return {
        status: "error",
        result: result,
        unwrap(): T {
            clientServiceLogger.logError("Tried to unwrap an action which failed: %o", result);
            throw "action failed with " + result.type;
        }
    }
}

export function createResult<T>(result: T) : ActionResult<T> {
    return {
        status: "success",
        result: result,
        unwrap(): T {
            return result;
        }
    }
}