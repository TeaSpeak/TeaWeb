import * as loader from "tc-loader";
import {Stage} from "tc-loader";

import * as React from "react";
import {Context} from "react";

import TextRenderer from "vendor/xbbcode/renderer/text";
import ReactRenderer from "vendor/xbbcode/renderer/react";
import HTMLRenderer from "vendor/xbbcode/renderer/html";

import "./emoji";
import "./highlight";
import "./YoutubeController";
import "./url";
import "./image";

export let BBCodeHandlerContext: Context<string>;

export const rendererText = new TextRenderer();
export const rendererReact = new ReactRenderer(true);
export const rendererHTML = new HTMLRenderer(rendererReact);

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "BBCode handler context",
    function: async () => {
        BBCodeHandlerContext = React.createContext<string>(undefined);
    },
    priority: 80
})