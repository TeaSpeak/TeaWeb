import {setMenuBarDriver} from "tc-shared/ui/frames/menu-bar";
import {WebMenuBarDriver} from "tc-backend/web/ui/menu-bar/Controller";

setMenuBarDriver(new WebMenuBarDriver());