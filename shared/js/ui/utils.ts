import * as loader from "tc-loader";

const getUrlParameter = key => {
    const match = location.search.match(new RegExp("(.*[?&]|^)" + key + "=([^&]+)($|&.*)"));
    if(!match) {
        return undefined;
    }

    return match[2];
};

/**
 * Ensure that the module has been loaded within the main application and not
 * within a popout.
 */
export function assertMainApplication() {
    /* TODO: get this directly from the loader itself */
    if((getUrlParameter("loader-target") || "app") !== "app") {
        debugger;
        loader.critical_error("Invalid module context", "Module only available in the main app context");
        throw "invalid module context";
    }
}