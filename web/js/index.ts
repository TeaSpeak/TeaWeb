interface Window {
    displayCriticalError: typeof displayCriticalError;
}

declare function displayCriticalError(message: string); /* fun fact: is implemented within loader.js, but only because we cant override that file */