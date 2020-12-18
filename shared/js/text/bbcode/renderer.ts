import TextRenderer from "vendor/xbbcode/renderer/text";
import ReactRenderer from "vendor/xbbcode/renderer/react";
import HTMLRenderer from "vendor/xbbcode/renderer/html";

export const rendererText = new TextRenderer();
export const rendererReact = new ReactRenderer();
export const rendererHTML = new HTMLRenderer(rendererReact);

import "./emoji";
import "./highlight";
import "./youtube";
import "./url";
import "./image";