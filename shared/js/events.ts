import {EventRegistryHooks, setEventRegistryHooks} from "tc-events";
import {LogCategory, logError, logTrace} from "tc-shared/log";

export * from "tc-events";

setEventRegistryHooks(new class implements EventRegistryHooks {
    logAsyncInvokeError(error: any) {
        logError(LogCategory.EVENT_REGISTRY, tr("Failed to invoke async callback:\n%o"), error);
    }

    logReactInvokeError(error: any) {
        logError(LogCategory.EVENT_REGISTRY, tr("Failed to invoke react callback:\n%o"), error);
    }

    logTrace(message: string, ...args: any[]) {
        logTrace(LogCategory.EVENT_REGISTRY, message, ...args);
    }
});