import {RDPChannel, RDPChannelTree, RDPClient, RDPEntry, RDPServer} from "./RendererDataProvider";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {
    ClientIcon,
    spriteEntries as kClientSpriteEntries,
    spriteHeight as kClientSpriteHeight,
    spriteUrl as kClientSpriteUrl,
    spriteWidth as kClientSpriteWidth,
} from "svg-sprites/client-icons";
import {LogCategory, logDebug} from "tc-shared/log";
import {ChannelTreeDragData} from "tc-shared/ui/tree/Definitions";

let spriteImage: HTMLImageElement;

async function initializeIconSpreedSheet() {
    spriteImage = new Image(kClientSpriteWidth, kClientSpriteHeight);
    spriteImage.src = loader.config.baseUrl + kClientSpriteUrl;
    await new Promise((resolve, reject) => {
        spriteImage.onload = resolve;
        spriteImage.onerror = () => reject("failed to load client icon sprite");
    });
}

function paintClientIcon(context: CanvasRenderingContext2D, icon: ClientIcon, offsetX: number, offsetY: number, width: number, height: number) {
    const sprite = kClientSpriteEntries.find(e => e.className === icon);
    if(!sprite) return undefined;

    context.drawImage(spriteImage, sprite.xOffset, sprite.yOffset, sprite.width, sprite.height, offsetX, offsetY, width, height);
}

export function generateDragElement(entries: RDPEntry[]) : HTMLElement {
    const totalHeight = entries.length * 18 + 2; /* the two extra for "low" letters like "gyj" etc. */
    const totalWidth = 250;

    let offsetY = 0;
    let offsetX = 20;

    const canvas = document.createElement("canvas");
    canvas.height = totalHeight;
    canvas.width = totalWidth;

    /* TODO: With font size? */
    {
        const ctx = canvas.getContext("2d");
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.font = "700 16px Roboto, Helvetica, Arial, sans-serif";

        for(const entry of entries) {
            let name: string;
            let icon: ClientIcon;

            if(entry instanceof RDPClient) {
                name = entry.name.name;
                icon = entry.status;
            } else if(entry instanceof RDPChannel) {
                name = entry.info?.name;
                icon = entry.icon;
            } else if(entry instanceof RDPServer) {
                icon = ClientIcon.ServerGreen;

                switch (entry.state.state) {
                    case "connected":
                        name = entry.state.name;
                        break;

                    case "disconnected":
                        name = tr("Not connected");
                        break;

                    case "connecting":
                        name = tr("Connecting");
                        break;
                }
            }

            /*
            ctx.strokeStyle = "red";
            ctx.moveTo(offsetX, offsetY);
            ctx.lineTo(offsetX + 1000, offsetY);
            ctx.stroke();
            */

            ctx.fillStyle = "black";
            paintClientIcon(ctx, icon, offsetX + 1, offsetY + 1, 16, 16);
            ctx.fillText(name, offsetX + 20, offsetY + 19);

            offsetY += 18;

            /*
            ctx.strokeStyle = "blue";
            ctx.moveTo(offsetX, offsetY);
            ctx.lineTo(offsetX + 1000, offsetY);
            ctx.stroke();
            */
        }
    }

    canvas.style.position = "absolute";
    canvas.style.left = "-100000000px";
    canvas.style.top = (Math.random() * 1000000).toFixed(0) + "px";
    document.body.appendChild(canvas);

    setTimeout(() => {
        canvas.remove();
    }, 50);

    return canvas as any;
}

const kDragDataType = "application/x-teaspeak-channel-move";
const kDragHandlerPrefix = "application/x-teaspeak-handler-";
const kDragTypePrefix = "application/x-teaspeak-type-";

export function setupDragData(transfer: DataTransfer, tree: RDPChannelTree, entries: RDPEntry[], type: string) {
    let data: ChannelTreeDragData = {
        version: 1,
        handlerId: tree.handlerId,
        entryIds: entries.map(e => e.entryId),
        entryTypes: entries.map(entry => {
            if(entry instanceof RDPServer) {
                return "server";
            } else if(entry instanceof RDPClient) {
                return "client";
            } else {
                return "channel";
            }
        }),
        type: type
    };

    transfer.effectAllowed = "all"
    transfer.dropEffect = "move";
    transfer.setData(kDragHandlerPrefix + tree.handlerId, "");
    transfer.setData(kDragTypePrefix + type, "");
    transfer.setData(kDragDataType, JSON.stringify(data));

    {
        let texts = [];
        for(const entry of entries) {
            if(entry instanceof RDPClient) {
                texts.push(entry.name?.name);
            } else if(entry instanceof RDPChannel) {
                texts.push(entry.info?.name);
            } else if(entry instanceof RDPServer) {
                texts.push(entry.state.state === "connected" ? entry.state.name : undefined);
            }
        }
        transfer.setData("text/plain", texts.filter(e => !!e).join(", "));
    }
    /* TODO: Other things as well! */
}

export function parseDragData(transfer: DataTransfer) : ChannelTreeDragData | undefined {
    const rawData = transfer.getData(kDragDataType);
    if(!rawData) { return undefined; }

    try {
        const data = JSON.parse(rawData) as ChannelTreeDragData;
        if(data.version !== 1) { throw tra("invalid data version {}", data.version); }
        return data;
    } catch (error) {
        logDebug(LogCategory.GENERAL, tr("Drag data parsing failed: %o"), error);
        return undefined;
    }
}

export function getDragInfo(transfer: DataTransfer) : { handlerId: string, type: string } | undefined {
    const keys = [...transfer.items].filter(e => e.kind === "string").map(e => e.type);
    const handlerId = keys.find(e => e.startsWith(kDragHandlerPrefix))?.substr(kDragHandlerPrefix.length);
    const type = keys.find(e => e.startsWith(kDragTypePrefix))?.substr(kDragTypePrefix.length);

    if(!handlerId || !type) {
        return undefined;
    }

    return {
        handlerId: handlerId,
        type: type
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "Icon sprite loader",
    function: async () => await initializeIconSpreedSheet(),
    priority: 10
});