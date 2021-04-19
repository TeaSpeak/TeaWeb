import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext, useEffect} from "react";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalAboutEvents, ModalAboutVariables} from "tc-shared/ui/modal/about/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import TeaCupAnimatedImage from "./TeaSpeakCupAnimated.png";
import {LogCategory, logError} from "tc-shared/log";
import {CallOnce} from "tc-shared/proto";
import {EventType, getKeyBoard, KeyEvent} from "tc-shared/PPTListener";

const cssStyle = require("./Renderer.scss");
const VariablesContext = React.createContext<UiVariableConsumer<ModalAboutVariables>>(undefined);
const EventsContext = React.createContext<Registry<ModalAboutEvents>>(undefined);

interface CanvasProperties {
    with: number,
    height: number,

    timestamp: number,
}

interface TickProperties {
    timestamp: number,
}

interface GameState {
    name() : string;

    initialize(game: SnakeGame);
    finalize();

    handleKeyEvent(event: KeyEvent);
    gameTick(game: SnakeGame, properties: TickProperties);
    render(context: CanvasRenderingContext2D, properties: CanvasProperties);
}

class GameStateCriticalError implements GameState {
    constructor(readonly errorMessage: string) {}

    name(): string {
        return "Critical Error";
    }

    initialize() { }
    finalize() { }

    handleKeyEvent(event: KeyEvent) {}
    gameTick(game: SnakeGame, properties: TickProperties) { }
    render(context: CanvasRenderingContext2D, properties: CanvasProperties) {
        context.fillStyle = "black";
        context.fillRect(0, 0, properties.with, properties.height);

        const fontPixelSize = Math.max(10, Math.floor(properties.height * 0.025));
        context.fillStyle = "red";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = fontPixelSize + "px Lucida Console, monospace";
        context.fillText(tr("A critical error happened") + ":", properties.with / 2, (properties.height - fontPixelSize - 2) / 2);
        context.fillText(this.errorMessage, properties.with / 2, (properties.height + fontPixelSize + 2) / 2);
    }
}

class GameStateStart implements GameState {
    private highScore: number;
    private spacePressed: boolean;

    name(): string {
        return "Start";
    }

    initialize(game: SnakeGame) {
        this.highScore = game.getHighScore();
        this.spacePressed = false;
    }

    finalize() { }

    handleKeyEvent(event: KeyEvent) {
        if(event.keyCode === "Space") {
            this.spacePressed = event.type !== EventType.KEY_RELEASE;
        }
    }

    gameTick(game: SnakeGame, properties: TickProperties) {
        if(this.spacePressed) {
            game.setState(new GameStateInGame());
            return;
        }

        this.highScore = game.getHighScore();
    }

    render(context: CanvasRenderingContext2D, properties: CanvasProperties) {
        const fontPixelSize = Math.max(10, Math.floor(properties.height * 0.05));
        const dynamicFontPixelSize = fontPixelSize + Math.sin(properties.timestamp / 750) / 2;

        context.textAlign = "center";
        context.textBaseline = "middle";

        context.font = fontPixelSize + "px Lucida Console, monospace";
        context.fillStyle = "white";
        context.fillText(tr("Welcome to the snake game."), properties.with / 2, properties.height / 2 - fontPixelSize);
        if(this.highScore > 0) {
            context.fillText(tr("High score: ") + this.highScore, properties.with / 2, properties.height / 2);
        }

        context.font = dynamicFontPixelSize + "px Lucida Console, monospace";
        context.fillStyle = "lightblue";
        context.fillText(tr("Press 'Space' to start!"), properties.with / 2, properties.height / 2 + fontPixelSize * 2);
    }
}

class GameStateGameOver implements GameState {
    private spacePressed: boolean;

    constructor(readonly gameScore: number) { }

    name(): string {
        return "Start";
    }

    initialize() {
        this.spacePressed = false;
    }

    finalize() { }

    handleKeyEvent(event: KeyEvent) {
        if(event.keyCode === "Space") {
            this.spacePressed = event.type !== EventType.KEY_RELEASE;
        }
    }

    gameTick(game: SnakeGame, properties: TickProperties) {
        if(this.spacePressed) {
            game.setState(new GameStateStart());
            return;
        }
    }

    render(context: CanvasRenderingContext2D, properties: CanvasProperties) {
        const fontPixelSize = Math.max(10, Math.floor(properties.height * 0.04));

        context.textAlign = "center";
        context.textBaseline = "middle";

        context.font = (fontPixelSize * 2) + "px Lucida Console, monospace";
        context.fillStyle = "red";
        context.fillText(tr("Game over!"), properties.with / 2, properties.height / 2 - fontPixelSize * 2);

        context.font = fontPixelSize + "px Lucida Console, monospace";
        context.fillStyle = "white";
        context.fillText(tr("Current score: ") + this.gameScore, properties.with / 2, properties.height / 2);
        context.fillText(tr("Press 'Space' to continue."), properties.with / 2, properties.height / 2 + fontPixelSize * 2);
    }
}

type GameDirection = "north" | "south" | "west" | "east";

class GameStateInGame implements GameState {
    private static readonly kGridWidth = 20;
    private static readonly kGridHeight = 20;

    private static readonly kSnakeSpeed = 300;

    private lastTileMove: number;
    private snake: GameDirection[];
    private snakePosition: { x: number, y: number };
    private snakeDirection: GameDirection;

    private applePosition: { x: number, y: number };

    name(): string {
        return "InGame";
    }

    initialize() {
        this.snake = [];
        this.snakePosition = { x: Math.floor(GameStateInGame.kGridWidth / 2), y: Math.floor(GameStateInGame.kGridHeight / 2) };
        this.snakeDirection = "north";

        this.generateApple([[this.snakePosition.x, this.snakePosition.y]]);
    }

    finalize() {}

    handleKeyEvent(event: KeyEvent) {
        if(event.type !== EventType.KEY_RELEASE) {
            switch (event.key) {
                case "ArrowRight":
                    this.snakeDirection = "east";
                    break;

                case "ArrowLeft":
                    this.snakeDirection = "west";
                    break;

                case "ArrowUp":
                    this.snakeDirection = "north";
                    break;

                case "ArrowDown":
                    this.snakeDirection = "south";
                    break;
            }
        }
    }

    gameTick(game: SnakeGame, properties: TickProperties) {
        if(typeof this.lastTileMove === "undefined") {
            this.lastTileMove = properties.timestamp;
        } else {
            let moveSteps = Math.floor((properties.timestamp - this.lastTileMove) / GameStateInGame.kSnakeSpeed);
            this.lastTileMove += moveSteps * GameStateInGame.kSnakeSpeed;

            let blockedTiles: [number, number][];
            while(moveSteps-- > 0) {
                this.snake.unshift(this.snakeDirection);

                switch (this.snakeDirection) {
                    case "north":
                        this.snakePosition.y -= 1;
                        break;

                    case "east":
                        this.snakePosition.x += 1;
                        break;

                    case "south":
                        this.snakePosition.y += 1;
                        break;

                    case "west":
                        this.snakePosition.x -= 1;
                        break;
                }

                let generateApple = false;
                if(this.snakePosition.x === this.applePosition.x && this.snakePosition.y === this.applePosition.y) {
                    generateApple = true;
                } else {
                    this.snake.pop();
                }

                blockedTiles = [];
                if(!this.validateSnake(blockedTiles)) {
                    game.updateHighScore(this.snake.length + 1);
                    game.setState(new GameStateGameOver(this.snake.length + 1));
                    return;
                }

                if(generateApple) {
                    if(!this.generateApple(blockedTiles)) {
                        game.updateHighScore(this.snake.length + 1);
                        game.setState(new GameStateGameOver(this.snake.length + 1));
                        return;
                    }
                }
            }
        }
    }

    render(context: CanvasRenderingContext2D, properties: CanvasProperties) {
        const fontPixelSize = Math.max(10, Math.floor(properties.height * 0.025));

        const borderSize = 2;
        const paddingTop = 5;
        const paddingLeft = 5;
        const tileSize = Math.min(
            (properties.height - borderSize * 2 - paddingTop * 2) / GameStateInGame.kGridHeight,
            (properties.with - borderSize * 2 - paddingLeft * 2) / GameStateInGame.kGridWidth
        );

        context.strokeStyle = "green";
        context.lineWidth = borderSize;

        const gridWidth = tileSize * GameStateInGame.kGridWidth;
        const gridHeight = tileSize * GameStateInGame.kGridHeight;
        const gridOffsetX = (properties.with - gridWidth) / 2;
        const gridOffsetY = (properties.height - gridHeight) / 2;

        context.strokeRect(gridOffsetX - borderSize / 2, gridOffsetY - borderSize / 2, gridWidth + borderSize, gridHeight + borderSize);

        {
            context.save();

            context.translate(gridOffsetX, gridOffsetY);
            context.scale(tileSize, tileSize);
            this.renderSnake(context);

            context.restore();
        }

        {
            context.font = fontPixelSize + "px Lucida Console, monospace";
            context.fillStyle = "green";
            context.textAlign = "left";
            context.textBaseline = "top";

            const textScore = tr("Score") + ":";
            const textScoreBounds = context.measureText(textScore)
            context.fillText(textScore, gridOffsetX + tileSize / 2, gridOffsetY + tileSize / 2);
            context.fillText(this.snake.length.toString(), gridOffsetX + tileSize / 2 + textScoreBounds.width + fontPixelSize * .25, gridOffsetY + tileSize / 2);
        }
    }

    renderSnake(context: CanvasRenderingContext2D) {
        let positionX = this.snakePosition.x, positionY = this.snakePosition.y;

        for(let tileIndex = 0; tileIndex <= this.snake.length; tileIndex++) {
            if(tileIndex === 0) {
                context.fillStyle = "lightgreen";
            } else if(tileIndex === 1) {
                context.fillStyle = "green";
            }
            context.fillRect(positionX, positionY, 1, 1);

            const tileDirection = this.snake[tileIndex];
            switch (tileDirection) {
                case "north":
                    positionY += 1;
                    break;

                case "east":
                    positionX -= 1;
                    break;

                case "south":
                    positionY -= 1;
                    break;

                case "west":
                    positionX += 1;
                    break;
            }
        }

        context.fillStyle = "red";
        context.fillRect(this.applePosition.x, this.applePosition.y, 1, 1);
    }

    private generateApple(blockedTiles: [number, number][]): boolean {
        const freeTiles = [];

        for(let posX = 0; posX < GameStateInGame.kGridWidth; posX++) {
            for(let posY = 0; posY < GameStateInGame.kGridHeight; posY++) {
                if(blockedTiles.findIndex(tile => posX === tile[0] && posY === tile[1]) === -1) {
                    freeTiles.push([posX, posY]);
                }
            }
        }

        if(freeTiles.length === 0) {
            return false;
        }

        const tile = freeTiles[Math.floor(Math.random() * freeTiles.length)];
        this.applePosition = {
            x: tile[0],
            y: tile[1]
        };

        return true;
    }

    private validateSnake(blockedTiles: [number, number][]) : boolean {
        let positionX = this.snakePosition.x, positionY = this.snakePosition.y;

        for(let tileIndex = 0; tileIndex <= this.snake.length; tileIndex++) {
            if(positionY < 0 || positionY >= GameStateInGame.kGridHeight) {
                return false;
            }

            if(positionX < 0 || positionX >= GameStateInGame.kGridWidth) {
                return false;
            }

            if(blockedTiles.findIndex(tile => tile[0] === positionX && tile[1] === positionY) !== -1) {
                return false;
            }

            blockedTiles.push([positionX, positionY]);
            switch (this.snake[tileIndex]) {
                case "north":
                    positionY += 1;
                    break;

                case "east":
                    positionX -= 1;
                    break;

                case "south":
                    positionY -= 1;
                    break;

                case "west":
                    positionX += 1;
                    break;
            }
        }

        return true;
    }
}

class SnakeGame {
    private static readonly kDebugInfo = false;
    private readonly keyListener: () => void;
    private readonly canvasElement: HTMLCanvasElement;
    private readonly canvasContext: CanvasRenderingContext2D;
    private readonly renderTimings: number[];
    private currentFps: number;
    private currentFrameTime: number;

    private animationId: number;
    private tickId: number;

    private highScore: number;
    private highScoreListener: (newValue: number) => void;


    private currentState: GameState;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvasElement = canvasElement;
        this.canvasContext = this.canvasElement.getContext("2d");
        this.setState(new GameStateCriticalError("Missing initial state"));

        this.currentFps = 0;
        this.currentFrameTime = 0;

        this.renderTimings = [];
        this.canvasContext.imageSmoothingEnabled = false;
        //this.canvasContext.imageSmoothingQuality = "high";

        this.animationId = requestAnimationFrame(() => {
            this.invokeRender();
        });

        this.tickId = setInterval(() => {
            try {
                this.currentState.gameTick(this, {
                    timestamp: Date.now()
                });
            } catch (error) {
                logError(LogCategory.GENERAL, tr("Failed to tick current game state: %o"), error);
                this.setState(new GameStateCriticalError(tr("game tick caused an error")))
            }
        }, 50);

        {
            const keyboard = getKeyBoard();
            const listener = event => {
                this.currentState.handleKeyEvent(event);
            };
            keyboard.registerListener(listener);
            this.keyListener = () => keyboard.unregisterListener(listener);
        }

        this.highScore = 0;
        this.setState(new GameStateStart());
    }

    getHighScore() : number { return this.highScore; }
    updateHighScore(gameScore: number) : boolean {
        if(gameScore <= this.highScore) {
            return false;
        }

        this.highScore = gameScore;
        if(this.highScoreListener) {
            this.highScoreListener(this.highScore);
        }

        return true;
    }

    setHighScoreListener(listener: (newValue: number) => void) {
        this.highScoreListener = listener;
    }

    @CallOnce
    destroy() {
        this.keyListener();

        cancelAnimationFrame(this.animationId);
        clearInterval(this.tickId);

        this.tickId = 0;
        this.animationId = 0;
    }

    setState(state: GameState) {
        this.currentState?.finalize();

        this.currentState = state;
        this.currentState.initialize(this);
    }

    private invokeRender() {
        const frameStart = performance.now();
        while(this.renderTimings[0] + 1000 <= frameStart) { this.renderTimings.shift(); }
        this.renderTimings.push(frameStart);
        this.currentFps = this.currentFps * .8 + this.renderTimings.length * .2;

        try {
            this.render();
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to render game: %o"), error);
        }

        const frameEnd = performance.now();
        this.currentFrameTime = this.currentFrameTime * .8 + (frameEnd - frameStart) * .2;

        this.animationId = requestAnimationFrame(() => {
            this.invokeRender();
        });
    }

    private render() {
        this.canvasElement.width = this.canvasElement.clientWidth;
        this.canvasElement.height = this.canvasElement.clientHeight;
        const properties: CanvasProperties = {
            with: this.canvasElement.clientWidth,
            height: this.canvasElement.clientHeight,
            timestamp: performance.now()
        };

        const ctx = this.canvasContext;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, properties.with, properties.height);

        this.currentState.render(this.canvasContext, properties);

        /* Debug Info */
        if(SnakeGame.kDebugInfo) {
            const fontPixelSize = Math.max(10, Math.floor(properties.height * 0.025));
            const keyWidth = 12 * fontPixelSize;

            ctx.fillStyle = "white";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.font = fontPixelSize + "px Lucida Console, monospace";
            ctx.fillText("FPS:", 10, 10);
            ctx.fillText(this.currentFps.toFixed(2), keyWidth, 10);

            ctx.fillText("Frame Time (ms):", 10, 10 + fontPixelSize * 1.2);
            ctx.fillText(this.currentFrameTime.toFixed(2), keyWidth, 10 + fontPixelSize * 1.2);

            ctx.fillText("Stage Name:", 10, 10 + fontPixelSize * 1.2 * 2);
            ctx.fillText(this.currentState.name(), keyWidth, 10 + fontPixelSize * 1.2 * 2);
        }
    }
}

const SnakeGameRenderer = React.memo(() => {
    const events = useContext(EventsContext);
    const refCanvas = React.createRef<HTMLCanvasElement>();

    useEffect(() => {
        const game = new SnakeGame(refCanvas.current);
        const listenerHighScore = events.on("notify_high_score", event => game.updateHighScore(event.score));

        game.setHighScoreListener(newValue => events.fire("action_update_high_score", { score: newValue }));
        events.fire("query_high_score");

        return () => {
            listenerHighScore();
            game.destroy();
        }
    }, []);

    return (
        <div className={cssStyle.gameContainer}>
            <canvas ref={refCanvas} />
        </div>
    )
});

const SnakeEasterEgg = React.memo(() => {
    const variables = useContext(VariablesContext);
    const eggShown = variables.useReadOnly("eggShown", undefined, false);

    if(eggShown) {
        return <SnakeGameRenderer />;
    } else {
        return null;
    }
})

const InfoTitle = React.memo(() => {
    const variables = useContext(VariablesContext);
    const uiVersion = variables.useReadOnly("uiVersion", undefined, useTr("loading"));

    return (
        <h1>
            TeaSpeak-Client build {uiVersion}
        </h1>
    );
});

const ModalTitle = React.memo(() => {
    const variables = useContext(VariablesContext);
    const eggShown = variables.useReadOnly("eggShown", undefined, false);

    if(eggShown) {
        return <Translatable key={"snake"}>The Snake Game</Translatable>;
    } else if(__build.target === "web") {
        return <Translatable key={"web"}>About TeaWeb</Translatable>;
    } else {
        return <Translatable key={"client"}>About TeaClient</Translatable>;
    }
});

const SupportEmail = React.memo(() => {
    let targetMail;
    if(__build.target === "web") {
        targetMail = "web.support@teaspeak.de";
    } else {
        targetMail = "client.support@teaspeak.de";
    }

    return (
        <a href={"mailto:" + targetMail}>{targetMail}</a>
    );
});

const VersionInfo = React.memo(() => {
    const variables = useContext(VariablesContext);
    const result = [];

    const uiVersion = variables.useReadOnly("uiVersion", undefined, useTr("loading"));
    if(__build.target === "web") {
        result.push(
            <div className={cssStyle.version} key={"web"}>
                <div className={cssStyle.key}><Translatable>TeaWeb</Translatable></div>:
                <div className={cssStyle.value}>{uiVersion}</div>
            </div>
        );
    } else {
        const nativeVersion = variables.useReadOnly("nativeVersion", undefined, useTr("loading"));
        result.push(
            <div className={cssStyle.version} key={"native"}>
                <div className={cssStyle.key}><Translatable>TeaClient</Translatable></div>:
                <div className={cssStyle.value}>{nativeVersion}</div>
            </div>
        );
        result.push(
            <div className={cssStyle.version} key={"ui"}>
                <div className={cssStyle.key}><Translatable>User Interface</Translatable></div>:
                <div className={cssStyle.value}>{uiVersion}</div>
            </div>
        );
    }

    return (
        <React.Fragment>
            {result}
        </React.Fragment>
    );
});

const LicenseInfo = React.memo(() => {
    let applicationName;
    if(__build.target === "web") {
        applicationName = "TeaWeb";
    } else {
        applicationName = "TeaClient";
    }
    return (
        <p>
            The {applicationName} application is licensed by MPL-2.0<br />
            More information here: <a href="https://github.com/TeaSpeak/TeaWeb/blob/master/LICENSE.TXT" target="_blank">https://github.com/TeaSpeak/TeaWeb/blob/master/LICENSE.TXT</a>
        </p>
    )
});

const MarkusHadenfeldt = React.memo(() => {
    const variables = useContext(VariablesContext);
    const variable = variables.useVariable("eggShown");

    return (
        <span onDoubleClick={() => variable.setValue(true)}>
            (Markus Hadenfeldt)
        </span>
    );
})

class Modal extends AbstractModal {
    private readonly events: Registry<ModalAboutEvents>;
    private readonly variables: UiVariableConsumer<ModalAboutVariables>;

    constructor(events: IpcRegistryDescription<ModalAboutEvents>, variables: IpcVariableDescriptor<ModalAboutVariables>) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);
    }

    renderBody(): React.ReactElement {
        return (
            <EventsContext.Provider value={this.events}>
                <VariablesContext.Provider value={this.variables}>
                    <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                        <div className={cssStyle.containerLeft}>
                            <div>
                                <img src={TeaCupAnimatedImage} alt={useTr("TeaSpeak - Logo")} draggable={false} />
                            </div>
                            <div>
                                Copyright (c) 2017-2021 TeaSpeak <br/>
                                <MarkusHadenfeldt />
                            </div>
                            <div>
                                <VersionInfo/>
                            </div>
                        </div>
                        <div className={cssStyle.containerRight}>
                            <InfoTitle/>
                            <h2><Translatable>Special thanks</Translatable></h2>
                            <p>
                                "Яedeemer" (Janni K.)<br />
                                Chromatic-Solutions (Sofian) for the lovely dark design
                            </p>
                            <h2><Translatable>Contact</Translatable></h2>
                            <p>
                                <Translatable>E-Mail</Translatable>: <SupportEmail /><br />
                                <Translatable>WWW</Translatable>: <a href="https://teaspeak.de" target="_blank">https://teaspeak.de</a><br/>
                                <Translatable>Community</Translatable>: <a href="https://forum.teaspeak.de" target="_blank">https://forum.teaspeak.de</a>
                            </p>
                            <h2><Translatable>License</Translatable></h2>
                            <LicenseInfo />
                        </div>
                        <SnakeEasterEgg />
                    </div>
                </VariablesContext.Provider>
            </EventsContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return (
            <VariablesContext.Provider value={this.variables}>
                <ModalTitle />
            </VariablesContext.Provider>
        );
    }
}

export default Modal;