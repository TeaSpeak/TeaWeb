import "webrtc-adapter";
import "webcrypto-liner";

import "./index.scss";
import "./FileTransfer";

import "./hooks/ServerConnection";
import "./hooks/ExternalModal";
import "./hooks/AudioRecorder";
import "./hooks/MenuBar";
import "./hooks/Video";

import "./UnloadHandler";

import "./ui/context-menu";
import "./ui/FaviconRenderer";

export = require("tc-shared/main");