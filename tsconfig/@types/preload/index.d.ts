declare namespace app {
    let loadedListener: (() => any)[]
}
declare function displayCriticalError(message: string, closeable: boolean);