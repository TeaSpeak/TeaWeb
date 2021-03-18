import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setExternalModalControllerFactory} from "tc-shared/ui/react-elements/external-modal";
import {ExternalModalController} from "../ExternalModalFactory";

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 50,
    name: "external modal controller factory setup",
    function: async () => {
        setExternalModalControllerFactory((modalType, constructorArguments, options) => new ExternalModalController(modalType, constructorArguments, options));
    }
});