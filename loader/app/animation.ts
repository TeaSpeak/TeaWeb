import * as loader from "./loader/loader";
import {Stage} from "./loader/loader";
import {getUrlParameter} from "./loader/utils";

let overlay: HTMLDivElement;
let setupContainer: HTMLDivElement;
let idleContainer: HTMLDivElement;
let idleSteamContainer: HTMLDivElement;
let loaderStageContainer: HTMLDivElement;

let finalizing = false;
let initializeTimestamp;

let verbose = false;
let apngSupport = undefined;

async function detectAPNGSupport() {
    const image = new Image();
    const ctx = document.createElement("canvas").getContext("2d");

    // frame 1 (skipped on apng-supporting browsers): [0, 0, 0, 255]
    // frame 2: [0, 0, 0, 0]
    image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjVEwAAAABAAAAAcMq2TYAAAANSURBVAiZY2BgYPgPAAEEAQB9ssjfAAAAGmZjVEwAAAAAAAAAAQAAAAEAAAAAAAAAAAD6A+gBAbNU+2sAAAARZmRBVAAAAAEImWNgYGBgAAAABQAB6MzFdgAAAABJRU5ErkJggg==";
    await new Promise(resolve => image.onload = resolve);

    ctx.drawImage(image, 0, 0);
    apngSupport = ctx.getImageData(0, 0, 1, 1).data[3] === 0;
}

function initializeElements() {
    overlay = document.getElementById("loader-overlay") as HTMLDivElement;
    if(!overlay)
        throw "missing loader overlay";

    for(const lazyImage of [...overlay.getElementsByTagName("lazy-img")]) {
        const image = document.createElement("img");
        image.alt = lazyImage.getAttribute("alt");
        image.src = lazyImage.getAttribute(apngSupport ? "src-apng" : "src-gif") || lazyImage.getAttribute("src");
        image.className = lazyImage.className;
        image.draggable = false;
        lazyImage.replaceWith(image);
    }

    setupContainer = overlay.getElementsByClassName("setup")[0] as HTMLDivElement;
    if(!setupContainer)
        throw "missing setup container";

    idleContainer = overlay.getElementsByClassName("idle")[0] as HTMLDivElement;
    if(!idleContainer)
        throw "missing idle container";

    idleSteamContainer = idleContainer.getElementsByClassName("steam")[0] as HTMLDivElement;
    if(!idleSteamContainer)
        throw "missing idle steam container";

    loaderStageContainer = overlay.getElementsByClassName("loader-stage")[0] as HTMLDivElement;
    if(!loaderStageContainer)
        throw "missing loader stage container";

    setupContainer.onanimationend = setupAnimationFinished;
    idleSteamContainer.onanimationiteration = idleSteamAnimationLooped;
    overlay.onanimationend = overlayAnimationFinished;
}

export async function initialize() {
    await detectAPNGSupport();
    try {
        initializeElements();
    } catch (error) {
        console.error("Failed to setup animations: %o", error);
        loader.critical_error("Animation setup failed", error);
        return false;
    }

    StageNames[Stage.SETUP] = "starting app";
    StageNames[Stage.TEMPLATES] = "loading templates";
    StageNames[Stage.STYLE] = "loading styles";
    StageNames[Stage.JAVASCRIPT] = "loading app";
    StageNames[Stage.JAVASCRIPT_INITIALIZING] = "initializing";
    StageNames[Stage.FINALIZING] = "rounding up";
    StageNames[Stage.LOADED] = "starting app";

    overlay.classList.add("initialized");

    if(parseInt(getUrlParameter("animation-short")) === 1) {
        setupAnimationFinished();
    } else {
        setupContainer.classList.add("visible");
    }

    initializeTimestamp = Date.now();
    return true;
}

export function abort() {
    overlay?.remove();
}

export function finalize() {
    if(getUrlParameter("loader-abort") === "1") {
        abort();
    } else {
        finalizing = true;

        if(loaderStageContainer)
            loaderStageContainer.innerText = "app loaded successfully (" + (Date.now() - initializeTimestamp) + "ms)";
    }
}

const StageNames = {};
export function updateState(state: Stage, tasks: string[]) {
    if(loaderStageContainer)
        loaderStageContainer.innerText = StageNames[state] + (tasks.length === 1 ? " (task: " + tasks[0] + ")" : " (tasks: " + tasks.join(",") + ")");
}

function setupAnimationFinished() {
    verbose && console.log("Entering idle animation");

    setupContainer.classList.remove("visible");
    idleContainer.classList.add("visible");
}

function idleSteamAnimationLooped() {
    verbose && console.log("Idle animation looped. Should finalize: %o", finalizing);
    if(!finalizing)
        return;

    overlay.classList.add("finishing");
}

function overlayAnimationFinished(event: AnimationEvent) {
    /* the text animation is the last one */
    if(event.animationName !== "swipe-out-text")
        return;

    verbose && console.log("Animation finished");
    overlay.remove();
}