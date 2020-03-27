/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./shared/js/main.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/process/browser.js":
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ "./node_modules/webpack/buildin/amd-options.js":
/*!****************************************!*\
  !*** (webpack)/buildin/amd-options.js ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {/* globals __webpack_amd_options__ */
module.exports = __webpack_amd_options__;

/* WEBPACK VAR INJECTION */}.call(this, {}))

/***/ }),

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./shared/js/BrowserIPC.ts":
/*!*********************************!*\
  !*** ./shared/js/BrowserIPC.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var bipc;
(function (bipc) {
    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    class BasicIPCHandler {
        constructor() {
            this._channels = [];
            this._query_results = {};
            this._cert_accept_callbacks = {};
            this._cert_accept_succeeded = {};
        }
        setup() {
            this.unique_id = uuidv4();
        }
        get_local_address() { return this.unique_id; }
        handle_message(message) {
            if (message.receiver === BasicIPCHandler.BROADCAST_UNIQUE_ID) {
                if (message.type == "process-query") {
                    log.debug(LogCategory.IPC, tr("Received a device query from %s."), message.sender);
                    this.send_message("process-query-response", {
                        request_query_id: message.data.query_id,
                        request_timestamp: message.data.timestamp,
                        device_id: this.unique_id,
                        protocol: BasicIPCHandler.PROTOCOL_VERSION
                    }, message.sender);
                    return;
                }
            }
            else if (message.receiver === this.unique_id) {
                if (message.type == "process-query-response") {
                    const response = message.data;
                    if (this._query_results[response.request_query_id])
                        this._query_results[response.request_query_id].push(response);
                    else {
                        log.warn(LogCategory.IPC, tr("Received a query response for an unknown request."));
                    }
                    return;
                }
                else if (message.type == "certificate-accept-callback") {
                    const data = message.data;
                    if (!this._cert_accept_callbacks[data.request_id]) {
                        log.warn(LogCategory.IPC, tr("Received certificate accept callback for an unknown request ID."));
                        return;
                    }
                    this._cert_accept_callbacks[data.request_id]();
                    delete this._cert_accept_callbacks[data.request_id];
                    this.send_message("certificate-accept-succeeded", {}, message.sender);
                    return;
                }
                else if (message.type == "certificate-accept-succeeded") {
                    if (!this._cert_accept_succeeded[message.sender]) {
                        log.warn(LogCategory.IPC, tr("Received certificate accept succeeded, but haven't a callback."));
                        return;
                    }
                    this._cert_accept_succeeded[message.sender]();
                    return;
                }
            }
            if (message.type === "channel") {
                const data = message.data;
                let channel_invoked = false;
                for (const channel of this._channels)
                    if (channel.channel_id === data.channel_id && (typeof (channel.target_id) === "undefined" || channel.target_id === message.sender)) {
                        if (channel.message_handler)
                            channel.message_handler(message.sender, message.receiver === BasicIPCHandler.BROADCAST_UNIQUE_ID, data);
                        channel_invoked = true;
                    }
                if (!channel_invoked) {
                    console.warn(tr("Received channel message for unknown channel (%s)"), data.channel_id);
                }
            }
        }
        create_channel(target_id, channel_id) {
            let channel = {
                target_id: target_id,
                channel_id: channel_id || uuidv4(),
                message_handler: undefined,
                send_message: (type, data, target) => {
                    if (typeof target !== "undefined") {
                        if (typeof channel.target_id === "string" && target != channel.target_id)
                            throw "target id does not match channel target";
                    }
                    this.send_message("channel", {
                        type: type,
                        data: data,
                        channel_id: channel.channel_id
                    }, target || channel.target_id || BasicIPCHandler.BROADCAST_UNIQUE_ID);
                }
            };
            this._channels.push(channel);
            return channel;
        }
        channels() { return this._channels; }
        delete_channel(channel) {
            this._channels = this._channels.filter(e => e !== channel);
        }
        query_processes(timeout) {
            return __awaiter(this, void 0, void 0, function* () {
                const query_id = uuidv4();
                this._query_results[query_id] = [];
                this.send_message("process-query", {
                    query_id: query_id,
                    timestamp: Date.now()
                });
                yield new Promise(resolve => setTimeout(resolve, timeout || 250));
                const result = this._query_results[query_id];
                delete this._query_results[query_id];
                return result;
            });
        }
        register_certificate_accept_callback(callback) {
            const id = uuidv4();
            this._cert_accept_callbacks[id] = callback;
            return this.unique_id + ":" + id;
        }
        post_certificate_accpected(id, timeout) {
            return new Promise((resolve, reject) => {
                const data = id.split(":");
                const timeout_id = setTimeout(() => {
                    delete this._cert_accept_succeeded[data[0]];
                    clearTimeout(timeout_id);
                    reject("timeout");
                }, timeout || 250);
                this._cert_accept_succeeded[data[0]] = () => {
                    delete this._cert_accept_succeeded[data[0]];
                    clearTimeout(timeout_id);
                    resolve();
                };
                this.send_message("certificate-accept-callback", {
                    request_id: data[1]
                }, data[0]);
            });
        }
    }
    BasicIPCHandler.BROADCAST_UNIQUE_ID = "00000000-0000-4000-0000-000000000000";
    BasicIPCHandler.PROTOCOL_VERSION = 1;
    bipc.BasicIPCHandler = BasicIPCHandler;
    class BroadcastChannelIPC extends BasicIPCHandler {
        constructor() {
            super();
        }
        setup() {
            super.setup();
            this.channel = new BroadcastChannel(BroadcastChannelIPC.CHANNEL_NAME);
            this.channel.onmessage = this.on_message.bind(this);
            this.channel.onmessageerror = this.on_error.bind(this);
        }
        on_message(event) {
            if (typeof (event.data) !== "string") {
                log.warn(LogCategory.IPC, tr("Received message with an invalid type (%s): %o"), typeof (event.data), event.data);
                return;
            }
            let message;
            try {
                message = JSON.parse(event.data);
            }
            catch (error) {
                log.error(LogCategory.IPC, tr("Received an invalid encoded message: %o"), event.data);
                return;
            }
            super.handle_message(message);
        }
        on_error(event) {
            log.warn(LogCategory.IPC, tr("Received error: %o"), event);
        }
        send_message(type, data, target) {
            const message = {};
            message.sender = this.unique_id;
            message.receiver = target ? target : BasicIPCHandler.BROADCAST_UNIQUE_ID;
            message.timestamp = Date.now();
            message.type = type;
            message.data = data;
            this.channel.postMessage(JSON.stringify(message));
        }
    }
    BroadcastChannelIPC.CHANNEL_NAME = "TeaSpeak-Web";
    let connect;
    (function (connect) {
        class ConnectHandler {
            constructor(ipc_handler) {
                this.callback_available = () => false;
                this.callback_execute = () => false;
                this._pending_connect_offers = [];
                this._pending_connects_requests = [];
                this.ipc_handler = ipc_handler;
            }
            setup() {
                this.ipc_channel = this.ipc_handler.create_channel(undefined, ConnectHandler.CHANNEL_NAME);
                this.ipc_channel.message_handler = this.on_message.bind(this);
            }
            on_message(sender, broadcast, message) {
                if (broadcast) {
                    if (message.type == "offer") {
                        const data = message.data;
                        const response = {
                            accepted: this.callback_available(data.data),
                            request_id: data.request_id
                        };
                        if (response.accepted) {
                            log.debug(LogCategory.IPC, tr("Received new connect offer from %s: %s"), sender, data.request_id);
                            const ld = {
                                remote_handler: sender,
                                data: data.data,
                                id: data.request_id,
                                timeout: 0
                            };
                            this._pending_connect_offers.push(ld);
                            ld.timeout = setTimeout(() => {
                                log.debug(LogCategory.IPC, tr("Dropping connect request %s, because we never received an execute."), ld.id);
                                this._pending_connect_offers.remove(ld);
                            }, 120 * 1000);
                        }
                        this.ipc_channel.send_message("offer-answer", response, sender);
                    }
                }
                else {
                    if (message.type == "offer-answer") {
                        const data = message.data;
                        const request = this._pending_connects_requests.find(e => e.id === data.request_id);
                        if (!request) {
                            log.warn(LogCategory.IPC, tr("Received connect offer answer with unknown request id (%s)."), data.request_id);
                            return;
                        }
                        if (!data.accepted) {
                            log.debug(LogCategory.IPC, tr("Client %s rejected the connect offer (%s)."), sender, request.id);
                            return;
                        }
                        if (request.remote_handler) {
                            log.debug(LogCategory.IPC, tr("Client %s accepted the connect offer (%s), but offer has already been accepted."), sender, request.id);
                            return;
                        }
                        log.debug(LogCategory.IPC, tr("Client %s accepted the connect offer (%s). Request local acceptance."), sender, request.id);
                        request.remote_handler = sender;
                        clearTimeout(request.timeout);
                        request.callback_avail().then(flag => {
                            if (!flag) {
                                request.callback_failed("local avail rejected");
                                return;
                            }
                            log.debug(LogCategory.IPC, tr("Executing connect with client %s"), request.remote_handler);
                            this.ipc_channel.send_message("execute", {
                                request_id: request.id
                            }, request.remote_handler);
                            request.timeout = setTimeout(() => {
                                request.callback_failed("connect execute timeout");
                            }, 1000);
                        }).catch(error => {
                            log.error(LogCategory.IPC, tr("Local avail callback caused an error: %o"), error);
                            request.callback_failed(tr("local avail callback caused an error"));
                        });
                    }
                    else if (message.type == "executed") {
                        const data = message.data;
                        const request = this._pending_connects_requests.find(e => e.id === data.request_id);
                        if (!request) {
                            log.warn(LogCategory.IPC, tr("Received connect executed with unknown request id (%s)."), data.request_id);
                            return;
                        }
                        if (request.remote_handler != sender) {
                            log.warn(LogCategory.IPC, tr("Received connect executed for request %s, but from wrong client: %s (expected %s)"), data.request_id, sender, request.remote_handler);
                            return;
                        }
                        log.debug(LogCategory.IPC, tr("Received connect executed response from client %s for request %s. Succeeded: %o (%s)"), sender, data.request_id, data.succeeded, data.message);
                        clearTimeout(request.timeout);
                        if (data.succeeded)
                            request.callback_success();
                        else
                            request.callback_failed(data.message);
                    }
                    else if (message.type == "execute") {
                        const data = message.data;
                        const request = this._pending_connect_offers.find(e => e.id === data.request_id);
                        if (!request) {
                            log.warn(LogCategory.IPC, tr("Received connect execute with unknown request id (%s)."), data.request_id);
                            return;
                        }
                        if (request.remote_handler != sender) {
                            log.warn(LogCategory.IPC, tr("Received connect execute for request %s, but from wrong client: %s (expected %s)"), data.request_id, sender, request.remote_handler);
                            return;
                        }
                        clearTimeout(request.timeout);
                        this._pending_connect_offers.remove(request);
                        log.debug(LogCategory.IPC, tr("Executing connect for %s"), data.request_id);
                        const cr = this.callback_execute(request.data);
                        const response = {
                            request_id: data.request_id,
                            succeeded: typeof (cr) !== "string" && cr,
                            message: typeof (cr) === "string" ? cr : "",
                        };
                        this.ipc_channel.send_message("executed", response, request.remote_handler);
                    }
                }
            }
            post_connect_request(data, callback_avail) {
                return new Promise((resolve, reject) => {
                    const pd = {
                        data: data,
                        id: uuidv4(),
                        timeout: 0,
                        callback_success: () => {
                            this._pending_connects_requests.remove(pd);
                            clearTimeout(pd.timeout);
                            resolve();
                        },
                        callback_failed: error => {
                            this._pending_connects_requests.remove(pd);
                            clearTimeout(pd.timeout);
                            reject(error);
                        },
                        callback_avail: callback_avail,
                    };
                    this._pending_connects_requests.push(pd);
                    this.ipc_channel.send_message("offer", {
                        request_id: pd.id,
                        data: pd.data
                    });
                    pd.timeout = setTimeout(() => {
                        pd.callback_failed("received no response to offer");
                    }, 50);
                });
            }
        }
        ConnectHandler.CHANNEL_NAME = "connect";
        connect.ConnectHandler = ConnectHandler;
    })(connect = bipc.connect || (bipc.connect = {}));
    let mproxy;
    (function (mproxy) {
        class MethodProxy {
            constructor(ipc_handler, connect_params) {
                this._proxied_methods = {};
                this._proxied_callbacks = {};
                this.ipc_handler = ipc_handler;
                this._ipc_parameters = connect_params;
                this._connected = false;
                this._slave = typeof (connect_params) !== "undefined";
                this._local = typeof (connect_params) !== "undefined" && connect_params.channel_id === "local" && connect_params.client_id === "local";
            }
            setup() {
                if (this._local) {
                    this._connected = true;
                    this.on_connected();
                }
                else {
                    if (this._slave)
                        this._ipc_channel = this.ipc_handler.create_channel(this._ipc_parameters.client_id, this._ipc_parameters.channel_id);
                    else
                        this._ipc_channel = this.ipc_handler.create_channel();
                    this._ipc_channel.message_handler = this._handle_message.bind(this);
                    if (this._slave)
                        this._ipc_channel.send_message("initialize", {});
                }
            }
            finalize() {
                if (!this._local) {
                    if (this._connected)
                        this._ipc_channel.send_message("finalize", {});
                    this.ipc_handler.delete_channel(this._ipc_channel);
                    this._ipc_channel = undefined;
                }
                for (const promise of Object.values(this._proxied_callbacks))
                    promise.reject("disconnected");
                this._proxied_callbacks = {};
                this._connected = false;
                this.on_disconnected();
            }
            register_method(method) {
                let method_name;
                if (typeof method === "function") {
                    log.debug(LogCategory.IPC, tr("Registering method proxy for %s"), method.name);
                    method_name = method.name;
                }
                else {
                    log.debug(LogCategory.IPC, tr("Registering method proxy for %s"), method);
                    method_name = method;
                }
                if (!this[method_name])
                    throw "method is missing in current object";
                this._proxied_methods[method_name] = this[method_name];
                if (!this._local) {
                    this[method_name] = (...args) => {
                        if (!this._connected)
                            return Promise.reject("not connected");
                        const proxy_callback = {
                            promise_id: uuidv4()
                        };
                        this._proxied_callbacks[proxy_callback.promise_id] = proxy_callback;
                        proxy_callback.promise = new Promise((resolve, reject) => {
                            proxy_callback.resolve = resolve;
                            proxy_callback.reject = reject;
                        });
                        this._ipc_channel.send_message("invoke", {
                            promise_id: proxy_callback.promise_id,
                            arguments: [...args],
                            method_name: method_name
                        });
                        return proxy_callback.promise;
                    };
                }
            }
            _handle_message(remote_id, boradcast, message) {
                if (message.type === "finalize") {
                    this._handle_finalize();
                }
                else if (message.type === "initialize") {
                    this._handle_remote_callback(remote_id);
                }
                else if (message.type === "invoke") {
                    this._handle_invoke(message.data);
                }
                else if (message.type === "result") {
                    this._handle_result(message.data);
                }
            }
            _handle_finalize() {
                this.on_disconnected();
                this.finalize();
                this._connected = false;
            }
            _handle_remote_callback(remote_id) {
                if (!this._ipc_channel.target_id) {
                    if (this._slave)
                        throw "initialize wrong state!";
                    this._ipc_channel.target_id = remote_id;
                    this.on_connected();
                    this._ipc_channel.send_message("initialize", true);
                }
                else {
                    if (!this._slave)
                        throw "initialize wrong state!";
                    this.on_connected();
                }
                this._connected = true;
            }
            _send_result(promise_id, success, message) {
                this._ipc_channel.send_message("result", {
                    promise_id: promise_id,
                    result: message,
                    success: success
                });
            }
            _handle_invoke(data) {
                if (this._proxied_methods[data.method_name])
                    throw "we could not invoke a local proxied method!";
                if (!this[data.method_name]) {
                    this._send_result(data.promise_id, false, "missing method");
                    return;
                }
                try {
                    log.info(LogCategory.IPC, tr("Invoking method %s with arguments: %o"), data.method_name, data.arguments);
                    const promise = this[data.method_name](...data.arguments);
                    promise.then(result => {
                        log.info(LogCategory.IPC, tr("Result: %o"), result);
                        this._send_result(data.promise_id, true, result);
                    }).catch(error => {
                        this._send_result(data.promise_id, false, error);
                    });
                }
                catch (error) {
                    this._send_result(data.promise_id, false, error);
                    return;
                }
            }
            _handle_result(data) {
                if (!this._proxied_callbacks[data.promise_id]) {
                    console.warn(tr("Received proxy method result for unknown promise"));
                    return;
                }
                const callback = this._proxied_callbacks[data.promise_id];
                delete this._proxied_callbacks[data.promise_id];
                if (data.success)
                    callback.resolve(data.result);
                else
                    callback.reject(data.result);
            }
            generate_connect_parameters() {
                if (this._slave)
                    throw "only masters can generate connect parameters!";
                if (!this._ipc_channel)
                    throw "please call setup() before";
                return {
                    channel_id: this._ipc_channel.channel_id,
                    client_id: this.ipc_handler.get_local_address()
                };
            }
            is_slave() { return this._local || this._slave; }
            is_master() { return this._local || !this._slave; }
        }
        mproxy.MethodProxy = MethodProxy;
    })(mproxy = bipc.mproxy || (bipc.mproxy = {}));
    let handler;
    let connect_handler;
    function setup() {
        if (!supported())
            return;
        handler = new BroadcastChannelIPC();
        handler.setup();
        connect_handler = new connect.ConnectHandler(handler);
        connect_handler.setup();
    }
    bipc.setup = setup;
    function get_handler() {
        return handler;
    }
    bipc.get_handler = get_handler;
    function get_connect_handler() {
        return connect_handler;
    }
    bipc.get_connect_handler = get_connect_handler;
    function supported() {
        return typeof (window.BroadcastChannel) !== "undefined";
    }
    bipc.supported = supported;
})(bipc = exports.bipc || (exports.bipc = {}));


/***/ }),

/***/ "./shared/js/PPTListener.ts":
/*!**********************************!*\
  !*** ./shared/js/PPTListener.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var KeyCode;
(function (KeyCode) {
    KeyCode[KeyCode["KEY_CANCEL"] = 3] = "KEY_CANCEL";
    KeyCode[KeyCode["KEY_HELP"] = 6] = "KEY_HELP";
    KeyCode[KeyCode["KEY_BACK_SPACE"] = 8] = "KEY_BACK_SPACE";
    KeyCode[KeyCode["KEY_TAB"] = 9] = "KEY_TAB";
    KeyCode[KeyCode["KEY_CLEAR"] = 12] = "KEY_CLEAR";
    KeyCode[KeyCode["KEY_RETURN"] = 13] = "KEY_RETURN";
    KeyCode[KeyCode["KEY_ENTER"] = 14] = "KEY_ENTER";
    KeyCode[KeyCode["KEY_SHIFT"] = 16] = "KEY_SHIFT";
    KeyCode[KeyCode["KEY_CONTROL"] = 17] = "KEY_CONTROL";
    KeyCode[KeyCode["KEY_ALT"] = 18] = "KEY_ALT";
    KeyCode[KeyCode["KEY_PAUSE"] = 19] = "KEY_PAUSE";
    KeyCode[KeyCode["KEY_CAPS_LOCK"] = 20] = "KEY_CAPS_LOCK";
    KeyCode[KeyCode["KEY_ESCAPE"] = 27] = "KEY_ESCAPE";
    KeyCode[KeyCode["KEY_SPACE"] = 32] = "KEY_SPACE";
    KeyCode[KeyCode["KEY_PAGE_UP"] = 33] = "KEY_PAGE_UP";
    KeyCode[KeyCode["KEY_PAGE_DOWN"] = 34] = "KEY_PAGE_DOWN";
    KeyCode[KeyCode["KEY_END"] = 35] = "KEY_END";
    KeyCode[KeyCode["KEY_HOME"] = 36] = "KEY_HOME";
    KeyCode[KeyCode["KEY_LEFT"] = 37] = "KEY_LEFT";
    KeyCode[KeyCode["KEY_UP"] = 38] = "KEY_UP";
    KeyCode[KeyCode["KEY_RIGHT"] = 39] = "KEY_RIGHT";
    KeyCode[KeyCode["KEY_DOWN"] = 40] = "KEY_DOWN";
    KeyCode[KeyCode["KEY_PRINTSCREEN"] = 44] = "KEY_PRINTSCREEN";
    KeyCode[KeyCode["KEY_INSERT"] = 45] = "KEY_INSERT";
    KeyCode[KeyCode["KEY_DELETE"] = 46] = "KEY_DELETE";
    KeyCode[KeyCode["KEY_0"] = 48] = "KEY_0";
    KeyCode[KeyCode["KEY_1"] = 49] = "KEY_1";
    KeyCode[KeyCode["KEY_2"] = 50] = "KEY_2";
    KeyCode[KeyCode["KEY_3"] = 51] = "KEY_3";
    KeyCode[KeyCode["KEY_4"] = 52] = "KEY_4";
    KeyCode[KeyCode["KEY_5"] = 53] = "KEY_5";
    KeyCode[KeyCode["KEY_6"] = 54] = "KEY_6";
    KeyCode[KeyCode["KEY_7"] = 55] = "KEY_7";
    KeyCode[KeyCode["KEY_8"] = 56] = "KEY_8";
    KeyCode[KeyCode["KEY_9"] = 57] = "KEY_9";
    KeyCode[KeyCode["KEY_SEMICOLON"] = 59] = "KEY_SEMICOLON";
    KeyCode[KeyCode["KEY_EQUALS"] = 61] = "KEY_EQUALS";
    KeyCode[KeyCode["KEY_A"] = 65] = "KEY_A";
    KeyCode[KeyCode["KEY_B"] = 66] = "KEY_B";
    KeyCode[KeyCode["KEY_C"] = 67] = "KEY_C";
    KeyCode[KeyCode["KEY_D"] = 68] = "KEY_D";
    KeyCode[KeyCode["KEY_E"] = 69] = "KEY_E";
    KeyCode[KeyCode["KEY_F"] = 70] = "KEY_F";
    KeyCode[KeyCode["KEY_G"] = 71] = "KEY_G";
    KeyCode[KeyCode["KEY_H"] = 72] = "KEY_H";
    KeyCode[KeyCode["KEY_I"] = 73] = "KEY_I";
    KeyCode[KeyCode["KEY_J"] = 74] = "KEY_J";
    KeyCode[KeyCode["KEY_K"] = 75] = "KEY_K";
    KeyCode[KeyCode["KEY_L"] = 76] = "KEY_L";
    KeyCode[KeyCode["KEY_M"] = 77] = "KEY_M";
    KeyCode[KeyCode["KEY_N"] = 78] = "KEY_N";
    KeyCode[KeyCode["KEY_O"] = 79] = "KEY_O";
    KeyCode[KeyCode["KEY_P"] = 80] = "KEY_P";
    KeyCode[KeyCode["KEY_Q"] = 81] = "KEY_Q";
    KeyCode[KeyCode["KEY_R"] = 82] = "KEY_R";
    KeyCode[KeyCode["KEY_S"] = 83] = "KEY_S";
    KeyCode[KeyCode["KEY_T"] = 84] = "KEY_T";
    KeyCode[KeyCode["KEY_U"] = 85] = "KEY_U";
    KeyCode[KeyCode["KEY_V"] = 86] = "KEY_V";
    KeyCode[KeyCode["KEY_W"] = 87] = "KEY_W";
    KeyCode[KeyCode["KEY_X"] = 88] = "KEY_X";
    KeyCode[KeyCode["KEY_Y"] = 89] = "KEY_Y";
    KeyCode[KeyCode["KEY_Z"] = 90] = "KEY_Z";
    KeyCode[KeyCode["KEY_LEFT_CMD"] = 91] = "KEY_LEFT_CMD";
    KeyCode[KeyCode["KEY_RIGHT_CMD"] = 93] = "KEY_RIGHT_CMD";
    KeyCode[KeyCode["KEY_CONTEXT_MENU"] = 93] = "KEY_CONTEXT_MENU";
    KeyCode[KeyCode["KEY_NUMPAD0"] = 96] = "KEY_NUMPAD0";
    KeyCode[KeyCode["KEY_NUMPAD1"] = 97] = "KEY_NUMPAD1";
    KeyCode[KeyCode["KEY_NUMPAD2"] = 98] = "KEY_NUMPAD2";
    KeyCode[KeyCode["KEY_NUMPAD3"] = 99] = "KEY_NUMPAD3";
    KeyCode[KeyCode["KEY_NUMPAD4"] = 100] = "KEY_NUMPAD4";
    KeyCode[KeyCode["KEY_NUMPAD5"] = 101] = "KEY_NUMPAD5";
    KeyCode[KeyCode["KEY_NUMPAD6"] = 102] = "KEY_NUMPAD6";
    KeyCode[KeyCode["KEY_NUMPAD7"] = 103] = "KEY_NUMPAD7";
    KeyCode[KeyCode["KEY_NUMPAD8"] = 104] = "KEY_NUMPAD8";
    KeyCode[KeyCode["KEY_NUMPAD9"] = 105] = "KEY_NUMPAD9";
    KeyCode[KeyCode["KEY_MULTIPLY"] = 106] = "KEY_MULTIPLY";
    KeyCode[KeyCode["KEY_ADD"] = 107] = "KEY_ADD";
    KeyCode[KeyCode["KEY_SEPARATOR"] = 108] = "KEY_SEPARATOR";
    KeyCode[KeyCode["KEY_SUBTRACT"] = 109] = "KEY_SUBTRACT";
    KeyCode[KeyCode["KEY_DECIMAL"] = 110] = "KEY_DECIMAL";
    KeyCode[KeyCode["KEY_DIVIDE"] = 111] = "KEY_DIVIDE";
    KeyCode[KeyCode["KEY_F1"] = 112] = "KEY_F1";
    KeyCode[KeyCode["KEY_F2"] = 113] = "KEY_F2";
    KeyCode[KeyCode["KEY_F3"] = 114] = "KEY_F3";
    KeyCode[KeyCode["KEY_F4"] = 115] = "KEY_F4";
    KeyCode[KeyCode["KEY_F5"] = 116] = "KEY_F5";
    KeyCode[KeyCode["KEY_F6"] = 117] = "KEY_F6";
    KeyCode[KeyCode["KEY_F7"] = 118] = "KEY_F7";
    KeyCode[KeyCode["KEY_F8"] = 119] = "KEY_F8";
    KeyCode[KeyCode["KEY_F9"] = 120] = "KEY_F9";
    KeyCode[KeyCode["KEY_F10"] = 121] = "KEY_F10";
    KeyCode[KeyCode["KEY_F11"] = 122] = "KEY_F11";
    KeyCode[KeyCode["KEY_F12"] = 123] = "KEY_F12";
    KeyCode[KeyCode["KEY_F13"] = 124] = "KEY_F13";
    KeyCode[KeyCode["KEY_F14"] = 125] = "KEY_F14";
    KeyCode[KeyCode["KEY_F15"] = 126] = "KEY_F15";
    KeyCode[KeyCode["KEY_F16"] = 127] = "KEY_F16";
    KeyCode[KeyCode["KEY_F17"] = 128] = "KEY_F17";
    KeyCode[KeyCode["KEY_F18"] = 129] = "KEY_F18";
    KeyCode[KeyCode["KEY_F19"] = 130] = "KEY_F19";
    KeyCode[KeyCode["KEY_F20"] = 131] = "KEY_F20";
    KeyCode[KeyCode["KEY_F21"] = 132] = "KEY_F21";
    KeyCode[KeyCode["KEY_F22"] = 133] = "KEY_F22";
    KeyCode[KeyCode["KEY_F23"] = 134] = "KEY_F23";
    KeyCode[KeyCode["KEY_F24"] = 135] = "KEY_F24";
    KeyCode[KeyCode["KEY_NUM_LOCK"] = 144] = "KEY_NUM_LOCK";
    KeyCode[KeyCode["KEY_SCROLL_LOCK"] = 145] = "KEY_SCROLL_LOCK";
    KeyCode[KeyCode["KEY_COMMA"] = 188] = "KEY_COMMA";
    KeyCode[KeyCode["KEY_PERIOD"] = 190] = "KEY_PERIOD";
    KeyCode[KeyCode["KEY_SLASH"] = 191] = "KEY_SLASH";
    KeyCode[KeyCode["KEY_BACK_QUOTE"] = 192] = "KEY_BACK_QUOTE";
    KeyCode[KeyCode["KEY_OPEN_BRACKET"] = 219] = "KEY_OPEN_BRACKET";
    KeyCode[KeyCode["KEY_BACK_SLASH"] = 220] = "KEY_BACK_SLASH";
    KeyCode[KeyCode["KEY_CLOSE_BRACKET"] = 221] = "KEY_CLOSE_BRACKET";
    KeyCode[KeyCode["KEY_QUOTE"] = 222] = "KEY_QUOTE";
    KeyCode[KeyCode["KEY_META"] = 224] = "KEY_META";
})(KeyCode = exports.KeyCode || (exports.KeyCode = {}));
var ppt;
(function (ppt) {
    let EventType;
    (function (EventType) {
        EventType[EventType["KEY_PRESS"] = 0] = "KEY_PRESS";
        EventType[EventType["KEY_RELEASE"] = 1] = "KEY_RELEASE";
        EventType[EventType["KEY_TYPED"] = 2] = "KEY_TYPED";
    })(EventType = ppt.EventType || (ppt.EventType = {}));
    let SpecialKey;
    (function (SpecialKey) {
        SpecialKey[SpecialKey["CTRL"] = 0] = "CTRL";
        SpecialKey[SpecialKey["WINDOWS"] = 1] = "WINDOWS";
        SpecialKey[SpecialKey["SHIFT"] = 2] = "SHIFT";
        SpecialKey[SpecialKey["ALT"] = 3] = "ALT";
    })(SpecialKey = ppt.SpecialKey || (ppt.SpecialKey = {}));
    function key_description(key) {
        let result = "";
        if (key.key_shift)
            result += " + " + tr("Shift");
        if (key.key_alt)
            result += " + " + tr("Alt");
        if (key.key_ctrl)
            result += " + " + tr("CTRL");
        if (key.key_windows)
            result += " + " + tr("Win");
        if (!result && !key.key_code)
            return tr("unset");
        if (key.key_code)
            result += " + " + key.key_code;
        return result.substr(3);
    }
    ppt.key_description = key_description;
})(ppt = exports.ppt || (exports.ppt = {}));


/***/ }),

/***/ "./shared/js/connection/CommandHelper.ts":
/*!***********************************************!*\
  !*** ./shared/js/connection/CommandHelper.ts ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ServerConnectionDeclaration_1 = __webpack_require__(/*! ./ServerConnectionDeclaration */ "./shared/js/connection/ServerConnectionDeclaration.ts");
const chat_1 = __webpack_require__(/*! ../ui/frames/chat */ "./shared/js/ui/frames/chat.ts");
const ConnectionBase_1 = __webpack_require__(/*! ./ConnectionBase */ "./shared/js/connection/ConnectionBase.ts");
const log_1 = __webpack_require__(/*! ../log */ "./shared/js/log.ts");
class CommandHelper extends ConnectionBase_1.AbstractCommandHandler {
    constructor(connection) {
        super(connection);
        this._awaiters_unique_ids = {};
        this._awaiters_unique_dbid = {};
        this.volatile_handler_boss = false;
        this.ignore_consumed = true;
    }
    initialize() {
        this.connection.command_handler_boss().register_handler(this);
    }
    destroy() {
        if (this.connection) {
            const hboss = this.connection.command_handler_boss();
            hboss && hboss.unregister_handler(this);
        }
        this._awaiters_unique_ids = undefined;
    }
    handle_command(command) {
        if (command.command == "notifyclientnamefromuid")
            this.handle_notifyclientnamefromuid(command.arguments);
        if (command.command == "notifyclientgetnamefromdbid")
            this.handle_notifyclientgetnamefromdbid(command.arguments);
        else
            return false;
        return true;
    }
    joinChannel(channel, password) {
        return this.connection.send_command("clientmove", {
            "clid": this.connection.client.getClientId(),
            "cid": channel.getChannelId(),
            "cpw": password || ""
        });
    }
    sendMessage(message, type, target) {
        if (type == chat_1.ChatType.SERVER)
            return this.connection.send_command("sendtextmessage", { "targetmode": 3, "target": 0, "msg": message });
        else if (type == chat_1.ChatType.CHANNEL)
            return this.connection.send_command("sendtextmessage", { "targetmode": 2, "target": target.getChannelId(), "msg": message });
        else if (type == chat_1.ChatType.CLIENT)
            return this.connection.send_command("sendtextmessage", { "targetmode": 1, "target": target.clientId(), "msg": message });
    }
    updateClient(key, value) {
        let data = {};
        data[key] = value;
        return this.connection.send_command("clientupdate", data);
    }
    info_from_uid(..._unique_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = [];
            const request = [];
            const unique_ids = new Set(_unique_ids);
            if (!unique_ids.size)
                return [];
            const unique_id_resolvers = {};
            for (const unique_id of unique_ids) {
                request.push({ 'cluid': unique_id });
                (this._awaiters_unique_ids[unique_id] || (this._awaiters_unique_ids[unique_id] = []))
                    .push(unique_id_resolvers[unique_id] = info => response.push(info));
            }
            try {
                yield this.connection.send_command("clientgetnamefromuid", request);
            }
            catch (error) {
                if (error instanceof ServerConnectionDeclaration_1.CommandResult && error.id == ServerConnectionDeclaration_1.ErrorID.EMPTY_RESULT) {
                }
                else {
                    throw error;
                }
            }
            finally {
                for (const unique_id of Object.keys(unique_id_resolvers))
                    (this._awaiters_unique_ids[unique_id] || []).remove(unique_id_resolvers[unique_id]);
            }
            return response;
        });
    }
    handle_notifyclientgetnamefromdbid(json) {
        for (const entry of json) {
            const info = {
                client_unique_id: entry["cluid"],
                client_nickname: entry["clname"],
                client_database_id: parseInt(entry["cldbid"])
            };
            const functions = this._awaiters_unique_dbid[info.client_database_id] || [];
            delete this._awaiters_unique_dbid[info.client_database_id];
            for (const fn of functions)
                fn(info);
        }
    }
    info_from_cldbid(..._cldbid) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = [];
            const request = [];
            const unique_cldbid = new Set(_cldbid);
            if (!unique_cldbid.size)
                return [];
            const unique_cldbid_resolvers = {};
            for (const cldbid of unique_cldbid) {
                request.push({ 'cldbid': cldbid });
                (this._awaiters_unique_dbid[cldbid] || (this._awaiters_unique_dbid[cldbid] = []))
                    .push(unique_cldbid_resolvers[cldbid] = info => response.push(info));
            }
            try {
                yield this.connection.send_command("clientgetnamefromdbid", request);
            }
            catch (error) {
                if (error instanceof ServerConnectionDeclaration_1.CommandResult && error.id == ServerConnectionDeclaration_1.ErrorID.EMPTY_RESULT) {
                }
                else {
                    throw error;
                }
            }
            finally {
                for (const cldbid of Object.keys(unique_cldbid_resolvers))
                    (this._awaiters_unique_dbid[cldbid] || []).remove(unique_cldbid_resolvers[cldbid]);
            }
            return response;
        });
    }
    handle_notifyclientnamefromuid(json) {
        for (const entry of json) {
            const info = {
                client_unique_id: entry["cluid"],
                client_nickname: entry["clname"],
                client_database_id: parseInt(entry["cldbid"])
            };
            const functions = this._awaiters_unique_ids[entry["cluid"]] || [];
            delete this._awaiters_unique_ids[entry["cluid"]];
            for (const fn of functions)
                fn(info);
        }
    }
    request_query_list(server_id = undefined) {
        return new Promise((resolve, reject) => {
            const single_handler = {
                command: "notifyquerylist",
                function: command => {
                    const json = command.arguments;
                    const result = {};
                    result.flag_all = json[0]["flag_all"];
                    result.flag_own = json[0]["flag_own"];
                    result.queries = [];
                    for (const entry of json) {
                        const rentry = {};
                        rentry.bounded_server = parseInt(entry["client_bound_server"]);
                        rentry.username = entry["client_login_name"];
                        rentry.unique_id = entry["client_unique_identifier"];
                        result.queries.push(rentry);
                    }
                    resolve(result);
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);
            let data = {};
            if (server_id !== undefined)
                data["server_id"] = server_id;
            this.connection.send_command("querylist", data).catch(error => {
                this.handler_boss.remove_single_handler(single_handler);
                if (error instanceof ServerConnectionDeclaration_1.CommandResult) {
                    if (error.id == ServerConnectionDeclaration_1.ErrorID.EMPTY_RESULT) {
                        resolve(undefined);
                        return;
                    }
                }
                reject(error);
            });
        });
    }
    request_playlist_list() {
        return new Promise((resolve, reject) => {
            const single_handler = {
                command: "notifyplaylistlist",
                function: command => {
                    const json = command.arguments;
                    const result = [];
                    for (const entry of json) {
                        try {
                            result.push({
                                playlist_id: parseInt(entry["playlist_id"]),
                                playlist_bot_id: parseInt(entry["playlist_bot_id"]),
                                playlist_title: entry["playlist_title"],
                                playlist_type: parseInt(entry["playlist_type"]),
                                playlist_owner_dbid: parseInt(entry["playlist_owner_dbid"]),
                                playlist_owner_name: entry["playlist_owner_name"],
                                needed_power_modify: parseInt(entry["needed_power_modify"]),
                                needed_power_permission_modify: parseInt(entry["needed_power_permission_modify"]),
                                needed_power_delete: parseInt(entry["needed_power_delete"]),
                                needed_power_song_add: parseInt(entry["needed_power_song_add"]),
                                needed_power_song_move: parseInt(entry["needed_power_song_move"]),
                                needed_power_song_remove: parseInt(entry["needed_power_song_remove"])
                            });
                        }
                        catch (error) {
                            log_1.log.error(log_1.LogCategory.NETWORKING, tr("Failed to parse playlist entry: %o"), error);
                        }
                    }
                    resolve(result);
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);
            this.connection.send_command("playlistlist").catch(error => {
                this.handler_boss.remove_single_handler(single_handler);
                if (error instanceof ServerConnectionDeclaration_1.CommandResult) {
                    if (error.id == ServerConnectionDeclaration_1.ErrorID.EMPTY_RESULT) {
                        resolve([]);
                        return;
                    }
                }
                reject(error);
            });
        });
    }
    request_playlist_songs(playlist_id) {
        return new Promise((resolve, reject) => {
            const single_handler = {
                command: "notifyplaylistsonglist",
                function: command => {
                    const json = command.arguments;
                    if (json[0]["playlist_id"] != playlist_id) {
                        log_1.log.error(log_1.LogCategory.NETWORKING, tr("Received invalid notification for playlist songs"));
                        return false;
                    }
                    const result = [];
                    for (const entry of json) {
                        try {
                            result.push({
                                song_id: parseInt(entry["song_id"]),
                                song_invoker: entry["song_invoker"],
                                song_previous_song_id: parseInt(entry["song_previous_song_id"]),
                                song_url: entry["song_url"],
                                song_url_loader: entry["song_url_loader"],
                                song_loaded: entry["song_loaded"] == true || entry["song_loaded"] == "1",
                                song_metadata: entry["song_metadata"]
                            });
                        }
                        catch (error) {
                            log_1.log.error(log_1.LogCategory.NETWORKING, tr("Failed to parse playlist song entry: %o"), error);
                        }
                    }
                    resolve(result);
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);
            this.connection.send_command("playlistsonglist", { playlist_id: playlist_id }).catch(error => {
                this.handler_boss.remove_single_handler(single_handler);
                if (error instanceof ServerConnectionDeclaration_1.CommandResult) {
                    if (error.id == ServerConnectionDeclaration_1.ErrorID.EMPTY_RESULT) {
                        resolve([]);
                        return;
                    }
                }
                reject(error);
            });
        });
    }
    request_playlist_client_list(playlist_id) {
        return new Promise((resolve, reject) => {
            const single_handler = {
                command: "notifyplaylistclientlist",
                function: command => {
                    const json = command.arguments;
                    if (json[0]["playlist_id"] != playlist_id) {
                        log_1.log.error(log_1.LogCategory.NETWORKING, tr("Received invalid notification for playlist clients"));
                        return false;
                    }
                    const result = [];
                    for (const entry of json)
                        result.push(parseInt(entry["cldbid"]));
                    resolve(result.filter(e => !isNaN(e)));
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);
            this.connection.send_command("playlistclientlist", { playlist_id: playlist_id }).catch(error => {
                this.handler_boss.remove_single_handler(single_handler);
                if (error instanceof ServerConnectionDeclaration_1.CommandResult && error.id == ServerConnectionDeclaration_1.ErrorID.EMPTY_RESULT) {
                    resolve([]);
                    return;
                }
                reject(error);
            });
        });
    }
    request_clients_by_server_group(group_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const single_handler = {
                    command: "notifyservergroupclientlist",
                    function: command => {
                        if (command.arguments[0]["sgid"] != group_id) {
                            log_1.log.error(log_1.LogCategory.NETWORKING, tr("Received invalid notification for server group client list"));
                            return false;
                        }
                        try {
                            const result = [];
                            for (const entry of command.arguments)
                                result.push({
                                    client_database_id: parseInt(entry["cldbid"]),
                                    client_nickname: entry["client_nickname"],
                                    client_unique_identifier: entry["client_unique_identifier"]
                                });
                            resolve(result);
                        }
                        catch (error) {
                            log_1.log.error(log_1.LogCategory.NETWORKING, tr("Failed to parse server group client list: %o"), error);
                            reject("failed to parse info");
                        }
                        return true;
                    }
                };
                this.handler_boss.register_single_handler(single_handler);
                this.connection.send_command("servergroupclientlist", { sgid: group_id }).catch(error => {
                    this.handler_boss.remove_single_handler(single_handler);
                    reject(error);
                });
            });
        });
    }
    request_playlist_info(playlist_id) {
        return new Promise((resolve, reject) => {
            const single_handler = {
                command: "notifyplaylistinfo",
                function: command => {
                    const json = command.arguments[0];
                    if (json["playlist_id"] != playlist_id) {
                        log_1.log.error(log_1.LogCategory.NETWORKING, tr("Received invalid notification for playlist info"));
                        return;
                    }
                    try {
                        resolve({
                            playlist_id: parseInt(json["playlist_id"]),
                            playlist_title: json["playlist_title"],
                            playlist_description: json["playlist_description"],
                            playlist_type: parseInt(json["playlist_type"]),
                            playlist_owner_dbid: parseInt(json["playlist_owner_dbid"]),
                            playlist_owner_name: json["playlist_owner_name"],
                            playlist_flag_delete_played: json["playlist_flag_delete_played"] == true || json["playlist_flag_delete_played"] == "1",
                            playlist_flag_finished: json["playlist_flag_finished"] == true || json["playlist_flag_finished"] == "1",
                            playlist_replay_mode: parseInt(json["playlist_replay_mode"]),
                            playlist_current_song_id: parseInt(json["playlist_current_song_id"]),
                            playlist_max_songs: parseInt(json["playlist_max_songs"])
                        });
                    }
                    catch (error) {
                        log_1.log.error(log_1.LogCategory.NETWORKING, tr("Failed to parse playlist info: %o"), error);
                        reject("failed to parse info");
                    }
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);
            this.connection.send_command("playlistinfo", { playlist_id: playlist_id }).catch(error => {
                this.handler_boss.remove_single_handler(single_handler);
                reject(error);
            });
        });
    }
    current_virtual_server_id() {
        if (this._who_am_i)
            return Promise.resolve(parseInt(this._who_am_i["virtualserver_id"]));
        return new Promise((resolve, reject) => {
            const single_handler = {
                function: command => {
                    if (command.command != "" && command.command.indexOf("=") == -1)
                        return false;
                    this._who_am_i = command.arguments[0];
                    resolve(parseInt(this._who_am_i["virtualserver_id"]));
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);
            this.connection.send_command("whoami").catch(error => {
                this.handler_boss.remove_single_handler(single_handler);
                reject(error);
            });
        });
    }
}
exports.CommandHelper = CommandHelper;


/***/ }),

/***/ "./shared/js/connection/ConnectionBase.ts":
/*!************************************************!*\
  !*** ./shared/js/connection/ConnectionBase.ts ***!
  \************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const CommandHelper_1 = __webpack_require__(/*! ./CommandHelper */ "./shared/js/connection/CommandHelper.ts");
exports.CommandOptionDefaults = {
    flagset: [],
    process_result: true,
    timeout: 1000
};
class AbstractServerConnection {
    constructor(client) {
        this.client = client;
        this.command_helper = new CommandHelper_1.CommandHelper(this);
    }
}
exports.AbstractServerConnection = AbstractServerConnection;
var voice;
(function (voice) {
    let PlayerState;
    (function (PlayerState) {
        PlayerState[PlayerState["PREBUFFERING"] = 0] = "PREBUFFERING";
        PlayerState[PlayerState["PLAYING"] = 1] = "PLAYING";
        PlayerState[PlayerState["BUFFERING"] = 2] = "BUFFERING";
        PlayerState[PlayerState["STOPPING"] = 3] = "STOPPING";
        PlayerState[PlayerState["STOPPED"] = 4] = "STOPPED";
    })(PlayerState = voice.PlayerState || (voice.PlayerState = {}));
    class AbstractVoiceConnection {
        constructor(connection) {
            this.connection = connection;
        }
    }
    voice.AbstractVoiceConnection = AbstractVoiceConnection;
})(voice = exports.voice || (exports.voice = {}));
class ServerCommand {
}
exports.ServerCommand = ServerCommand;
class AbstractCommandHandler {
    constructor(connection) {
        this.volatile_handler_boss = false;
        this.ignore_consumed = false;
        this.connection = connection;
    }
}
exports.AbstractCommandHandler = AbstractCommandHandler;
class AbstractCommandHandlerBoss {
    constructor(connection) {
        this.command_handlers = [];
        this.single_command_handler = [];
        this.connection = connection;
    }
    destroy() {
        this.command_handlers = undefined;
        this.single_command_handler = undefined;
    }
    register_handler(handler) {
        if (!handler.volatile_handler_boss && handler.handler_boss)
            throw "handler already registered";
        this.command_handlers.remove(handler);
        this.command_handlers.push(handler);
        handler.handler_boss = this;
    }
    unregister_handler(handler) {
        if (!handler.volatile_handler_boss && handler.handler_boss !== this) {
            console.warn(tr("Tried to unregister command handler which does not belong to the handler boss"));
            return;
        }
        this.command_handlers.remove(handler);
        handler.handler_boss = undefined;
    }
    register_single_handler(handler) {
        this.single_command_handler.push(handler);
    }
    remove_single_handler(handler) {
        this.single_command_handler.remove(handler);
    }
    handlers() {
        return this.command_handlers;
    }
    invoke_handle(command) {
        let flag_consumed = false;
        for (const handler of this.command_handlers) {
            try {
                if (!flag_consumed || handler.ignore_consumed)
                    flag_consumed = flag_consumed || handler.handle_command(command);
            }
            catch (error) {
                console.error(tr("Failed to invoke command handler. Invocation results in an exception: %o"), error);
            }
        }
        for (const handler of [...this.single_command_handler]) {
            if (handler.command && handler.command != command.command)
                continue;
            try {
                if (handler.function(command))
                    this.single_command_handler.remove(handler);
            }
            catch (error) {
                console.error(tr("Failed to invoke single command handler. Invocation results in an exception: %o"), error);
            }
        }
        return flag_consumed;
    }
}
exports.AbstractCommandHandlerBoss = AbstractCommandHandlerBoss;


/***/ }),

/***/ "./shared/js/connection/ServerConnectionDeclaration.ts":
/*!*************************************************************!*\
  !*** ./shared/js/connection/ServerConnectionDeclaration.ts ***!
  \*************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var ErrorID;
(function (ErrorID) {
    ErrorID[ErrorID["NOT_IMPLEMENTED"] = 2] = "NOT_IMPLEMENTED";
    ErrorID[ErrorID["COMMAND_NOT_FOUND"] = 256] = "COMMAND_NOT_FOUND";
    ErrorID[ErrorID["PERMISSION_ERROR"] = 2568] = "PERMISSION_ERROR";
    ErrorID[ErrorID["EMPTY_RESULT"] = 1281] = "EMPTY_RESULT";
    ErrorID[ErrorID["PLAYLIST_IS_IN_USE"] = 8451] = "PLAYLIST_IS_IN_USE";
    ErrorID[ErrorID["FILE_ALREADY_EXISTS"] = 2050] = "FILE_ALREADY_EXISTS";
    ErrorID[ErrorID["CLIENT_INVALID_ID"] = 512] = "CLIENT_INVALID_ID";
    ErrorID[ErrorID["CONVERSATION_INVALID_ID"] = 8704] = "CONVERSATION_INVALID_ID";
    ErrorID[ErrorID["CONVERSATION_MORE_DATA"] = 8705] = "CONVERSATION_MORE_DATA";
    ErrorID[ErrorID["CONVERSATION_IS_PRIVATE"] = 8706] = "CONVERSATION_IS_PRIVATE";
})(ErrorID = exports.ErrorID || (exports.ErrorID = {}));
class CommandResult {
    constructor(json) {
        this.json = json;
        this.id = parseInt(json["id"]);
        this.message = json["msg"];
        this.extra_message = "";
        if (json["extra_msg"])
            this.extra_message = json["extra_msg"];
        this.success = this.id == 0;
    }
}
exports.CommandResult = CommandResult;


/***/ }),

/***/ "./shared/js/crypto/asn1.ts":
/*!**********************************!*\
  !*** ./shared/js/crypto/asn1.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var asn1;
(function (asn1) {
    const ellipsis = "\u2026";
    function string_cut(str, len) {
        if (str.length > len)
            str = str.substring(0, len) + ellipsis;
        return str;
    }
    class Stream {
        constructor(data, position) {
            if (data instanceof Stream)
                this.data = data.data;
            else
                this.data = data;
            this.position = position;
        }
        length() {
            if (this.data instanceof ArrayBuffer)
                return this.data.byteLength;
            return this.data.length;
        }
        get(position) {
            if (position === undefined)
                position = this.position++;
            if (position >= this.length())
                throw 'Requesting byte offset ' + this.position + ' on a stream of length ' + this.length();
            return (typeof (this.data) === "string") ? this.data.charCodeAt(position) : this.data[position];
        }
        hexByte(byte) {
            return Stream.HEX_DIGITS.charAt((byte >> 4) & 0xF) + Stream.HEX_DIGITS.charAt(byte & 0xF);
        }
        parseStringISO(start, end) {
            let s = "";
            for (let i = start; i < end; ++i)
                s += String.fromCharCode(this.get(i));
            return s;
        }
        parseStringUTF(start, end) {
            let s = "";
            for (let i = start; i < end;) {
                let c = this.get(i++);
                if (c < 128)
                    s += String.fromCharCode(c);
                else if ((c > 191) && (c < 224))
                    s += String.fromCharCode(((c & 0x1F) << 6) | (this.get(i++) & 0x3F));
                else
                    s += String.fromCharCode(((c & 0x0F) << 12) | ((this.get(i++) & 0x3F) << 6) | (this.get(i++) & 0x3F));
            }
            return s;
        }
        parseStringBMP(start, end) {
            let str = "", hi, lo;
            for (let i = start; i < end;) {
                hi = this.get(i++);
                lo = this.get(i++);
                str += String.fromCharCode((hi << 8) | lo);
            }
            return str;
        }
        parseTime(start, end, shortYear) {
            let s = this.parseStringISO(start, end), m = (shortYear ? Stream.reTimeS : Stream.reTimeL).exec(s);
            if (!m)
                return "Unrecognized time: " + s;
            if (shortYear) {
                throw "fixme!";
            }
            s = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4];
            if (m[5]) {
                s += ":" + m[5];
                if (m[6]) {
                    s += ":" + m[6];
                    if (m[7])
                        s += "." + m[7];
                }
            }
            if (m[8]) {
                s += " UTC";
                if (m[8] != 'Z') {
                    s += m[8];
                    if (m[9])
                        s += ":" + m[9];
                }
            }
            return s;
        }
        ;
        parseInteger(start, end) {
            let current = this.get(start);
            let negative = (current > 127);
            let padding = negative ? 255 : 0;
            let length;
            let descriptor;
            while (current == padding && ++start < end)
                current = this.get(start);
            length = end - start;
            if (length === 0)
                return negative ? '-1' : '0';
            if (length > 4) {
                descriptor = current;
                length <<= 3;
                while (((descriptor ^ padding) & 0x80) == 0) {
                    descriptor <<= 1;
                    --length;
                }
                descriptor = "(" + length + " bit)\n";
            }
            if (negative)
                current = current - 256;
            let number = "";
            if (typeof (Int10) !== "undefined") {
                let n = new Int10(current);
                for (let i = start + 1; i < end; ++i)
                    n.mulAdd(256, this.get(i));
                number = n.toString();
            }
            else {
                let n = 0;
                for (let i = start + 1; i < end; ++i) {
                    n <<= 8;
                    n += this.get(i);
                }
                number = n.toString();
            }
            return descriptor + number;
        }
        ;
        isASCII(start, end) {
            for (let i = start; i < end; ++i) {
                const c = this.get(i);
                if (c < 32 || c > 176)
                    return false;
            }
            return true;
        }
        ;
        parseBitString(start, end, maxLength) {
            let unusedBit = this.get(start), lenBit = ((end - start - 1) << 3) - unusedBit, intro = "(" + lenBit + " bit)\n", s = "";
            for (let i = start + 1; i < end; ++i) {
                let b = this.get(i), skip = (i == end - 1) ? unusedBit : 0;
                for (let j = 7; j >= skip; --j)
                    s += (b >> j) & 1 ? "1" : "0";
                if (s.length > maxLength)
                    return intro + string_cut(s, maxLength);
            }
            return intro + s;
        }
        ;
        parseOctetString(start, end, maxLength) {
            if (this.isASCII(start, end))
                return string_cut(this.parseStringISO(start, end), maxLength);
            let len = end - start, s = "(" + len + " byte)\n";
            maxLength /= 2;
            if (len > maxLength)
                end = start + maxLength;
            for (let i = start; i < end; ++i)
                s += this.hexByte(this.get(i));
            if (len > maxLength)
                s += ellipsis;
            return s;
        }
        ;
        parseOID(start, end, maxLength) {
            let s = '', n = new Int10(), bits = 0;
            for (let i = start; i < end; ++i) {
                let v = this.get(i);
                n.mulAdd(128, v & 0x7F);
                bits += 7;
                if (!(v & 0x80)) {
                    if (s === '') {
                        n = n.simplify();
                        if (n instanceof Int10) {
                            n.sub(80);
                            s = "2." + n.toString();
                        }
                        else {
                            let m = n < 80 ? n < 40 ? 0 : 1 : 2;
                            s = m + "." + (n - m * 40);
                        }
                    }
                    else
                        s += "." + n.toString();
                    if (s.length > maxLength)
                        return string_cut(s, maxLength);
                    n = new Int10();
                    bits = 0;
                }
            }
            if (bits > 0)
                s += ".incomplete";
            return s;
        }
        ;
    }
    Stream.HEX_DIGITS = "0123456789ABCDEF";
    Stream.reTimeS = /^(\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
    Stream.reTimeL = /^(\d\d\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
    asn1.Stream = Stream;
    let TagClass;
    (function (TagClass) {
        TagClass[TagClass["UNIVERSAL"] = 0] = "UNIVERSAL";
        TagClass[TagClass["APPLICATION"] = 1] = "APPLICATION";
        TagClass[TagClass["CONTEXT"] = 2] = "CONTEXT";
        TagClass[TagClass["PRIVATE"] = 3] = "PRIVATE";
    })(TagClass = asn1.TagClass || (asn1.TagClass = {}));
    let TagType;
    (function (TagType) {
        TagType[TagType["EOC"] = 0] = "EOC";
        TagType[TagType["BOOLEAN"] = 1] = "BOOLEAN";
        TagType[TagType["INTEGER"] = 2] = "INTEGER";
        TagType[TagType["BIT_STRING"] = 3] = "BIT_STRING";
        TagType[TagType["OCTET_STRING"] = 4] = "OCTET_STRING";
        TagType[TagType["NULL"] = 5] = "NULL";
        TagType[TagType["OBJECT_IDENTIFIER"] = 6] = "OBJECT_IDENTIFIER";
        TagType[TagType["ObjectDescriptor"] = 7] = "ObjectDescriptor";
        TagType[TagType["EXTERNAL"] = 8] = "EXTERNAL";
        TagType[TagType["REAL"] = 9] = "REAL";
        TagType[TagType["ENUMERATED"] = 10] = "ENUMERATED";
        TagType[TagType["EMBEDDED_PDV"] = 11] = "EMBEDDED_PDV";
        TagType[TagType["UTF8String"] = 12] = "UTF8String";
        TagType[TagType["SEQUENCE"] = 16] = "SEQUENCE";
        TagType[TagType["SET"] = 17] = "SET";
        TagType[TagType["NumericString"] = 18] = "NumericString";
        TagType[TagType["PrintableString"] = 19] = "PrintableString";
        TagType[TagType["TeletextString"] = 20] = "TeletextString";
        TagType[TagType["VideotexString"] = 21] = "VideotexString";
        TagType[TagType["IA5String"] = 22] = "IA5String";
        TagType[TagType["UTCTime"] = 23] = "UTCTime";
        TagType[TagType["GeneralizedTime"] = 24] = "GeneralizedTime";
        TagType[TagType["GraphicString"] = 25] = "GraphicString";
        TagType[TagType["VisibleString"] = 26] = "VisibleString";
        TagType[TagType["GeneralString"] = 27] = "GeneralString";
        TagType[TagType["UniversalString"] = 28] = "UniversalString";
        TagType[TagType["BMPString"] = 30] = "BMPString";
    })(TagType = asn1.TagType || (asn1.TagType = {}));
    class ASN1Tag {
        constructor(stream) {
            let buf = stream.get();
            this.tagClass = buf >> 6;
            this.tagConstructed = ((buf & 0x20) !== 0);
            this.tagNumber = buf & 0x1F;
            if (this.tagNumber == 0x1F) {
                let n = new Int10();
                do {
                    buf = stream.get();
                    n.mulAdd(128, buf & 0x7F);
                } while (buf & 0x80);
                this.tagNumber = n.simplify();
            }
        }
        isUniversal() {
            return this.tagClass === 0x00;
        }
        ;
        isEOC() {
            return this.tagClass === 0x00 && this.tagNumber === 0x00;
        }
        ;
    }
    class ASN1 {
        constructor(stream, header, length, tag, children) {
            this.stream = stream;
            this.header = header;
            this.length = length;
            this.tag = tag;
            this.children = children;
        }
        content(max_length, type) {
            if (this.tag === undefined)
                return null;
            if (max_length === undefined)
                max_length = Infinity;
            let content = this.posContent(), len = Math.abs(this.length);
            if (!this.tag.isUniversal()) {
                if (this.children !== null)
                    return "(" + this.children.length + " elem)";
                return this.stream.parseOctetString(content, content + len, max_length);
            }
            switch (type || this.tag.tagNumber) {
                case 0x01:
                    return (this.stream.get(content) === 0) ? "false" : "true";
                case 0x02:
                    return this.stream.parseInteger(content, content + len);
                case 0x03:
                    return this.children ? "(" + this.children.length + " elem)" :
                        this.stream.parseBitString(content, content + len, max_length);
                case 0x04:
                    return this.children ? "(" + this.children.length + " elem)" :
                        this.stream.parseOctetString(content, content + len, max_length);
                case 0x06:
                    return this.stream.parseOID(content, content + len, max_length);
                case 0x10:
                case 0x11:
                    if (this.children !== null)
                        return "(" + this.children.length + " elem)";
                    else
                        return "(no elem)";
                case 0x0C:
                    return string_cut(this.stream.parseStringUTF(content, content + len), max_length);
                case 0x12:
                case 0x13:
                case 0x14:
                case 0x15:
                case 0x16:
                case 0x1A:
                    return string_cut(this.stream.parseStringISO(content, content + len), max_length);
                case 0x1E:
                    return string_cut(this.stream.parseStringBMP(content, content + len), max_length);
                case 0x17:
                case 0x18:
                    return this.stream.parseTime(content, content + len, (this.tag.tagNumber == 0x17));
            }
            return null;
        }
        ;
        typeName() {
            switch (this.tag.tagClass) {
                case 0:
                    return TagType[this.tag.tagNumber] || ("Universal_" + this.tag.tagNumber.toString());
                case 1:
                    return "Application_" + this.tag.tagNumber.toString();
                case 2:
                    return "[" + this.tag.tagNumber.toString() + "]";
                case 3:
                    return "Private_" + this.tag.tagNumber.toString();
            }
        }
        ;
        toString() {
            return this.typeName() + "@" + this.stream.position + "[header:" + this.header + ",length:" + this.length + ",sub:" + ((this.children === null) ? 'null' : this.children.length) + "]";
        }
        toPrettyString(indent) {
            if (indent === undefined)
                indent = '';
            let s = indent + this.typeName() + " @" + this.stream.position;
            if (this.length >= 0)
                s += "+";
            s += this.length;
            if (this.tag.tagConstructed)
                s += " (constructed)";
            else if ((this.tag.isUniversal() && ((this.tag.tagNumber == 0x03) || (this.tag.tagNumber == 0x04))) && (this.children !== null))
                s += " (encapsulates)";
            let content = this.content();
            if (content)
                s += ": " + content.replace(/\n/g, '|');
            s += "\n";
            if (this.children !== null) {
                indent += '  ';
                for (let i = 0, max = this.children.length; i < max; ++i)
                    s += this.children[i].toPrettyString(indent);
            }
            return s;
        }
        ;
        posStart() {
            return this.stream.position;
        }
        ;
        posContent() {
            return this.stream.position + this.header;
        }
        ;
        posEnd() {
            return this.stream.position + this.header + Math.abs(this.length);
        }
        ;
        static decodeLength(stream) {
            let buf = stream.get();
            const len = buf & 0x7F;
            if (len == buf)
                return len;
            if (len > 6)
                throw "Length over 48 bits not supported at position " + (stream.position - 1);
            if (len === 0)
                return null;
            buf = 0;
            for (let i = 0; i < len; ++i)
                buf = (buf << 8) + stream.get();
            return buf;
        }
        ;
        static encodeLength(buffer, offset, length) {
            if (length < 0x7F) {
                buffer[offset] = length;
            }
            else {
                buffer[offset] = 0x80;
                let index = 1;
                while (length > 0) {
                    buffer[offset + index++] = length & 0xFF;
                    length >>= 8;
                    buffer[offset] += 1;
                }
            }
        }
    }
    asn1.ASN1 = ASN1;
    function decode0(stream) {
        const streamStart = new Stream(stream, 0);
        const tag = new ASN1Tag(stream);
        let len = ASN1.decodeLength(stream);
        const start = stream.position;
        const length_header = start - streamStart.position;
        let children = null;
        const query_children = () => {
            children = [];
            if (len !== null) {
                const end = start + len;
                if (end > stream.length())
                    throw 'Container at offset ' + start + ' has a length of ' + len + ', which is past the end of the stream';
                while (stream.position < end)
                    children[children.length] = decode0(stream);
                if (stream.position != end)
                    throw 'Content size is not correct for container at offset ' + start;
            }
            else {
                try {
                    while (true) {
                        const s = decode0(stream);
                        if (s.tag.isEOC())
                            break;
                        children[children.length] = s;
                    }
                    len = start - stream.position;
                }
                catch (e) {
                    throw 'Exception while decoding undefined length content at offset ' + start + ': ' + e;
                }
            }
        };
        if (tag.tagConstructed) {
            query_children();
        }
        else if (tag.isUniversal() && ((tag.tagNumber == 0x03) || (tag.tagNumber == 0x04))) {
            try {
                if (tag.tagNumber == 0x03)
                    if (stream.get() != 0)
                        throw "BIT STRINGs with unused bits cannot encapsulate.";
                query_children();
                for (let i = 0; i < children.length; ++i)
                    if (children[i].tag.isEOC())
                        throw 'EOC is not supposed to be actual content.';
            }
            catch (e) {
                children = null;
            }
        }
        if (children === null) {
            if (len === null)
                throw "We can't skip over an invalid tag with undefined length at offset " + start;
            stream.position = start + Math.abs(len);
        }
        return new ASN1(streamStart, length_header, len, tag, children);
    }
    function decode(stream) {
        return decode0(new Stream(stream, 0));
    }
    asn1.decode = decode;
})(asn1 = exports.asn1 || (exports.asn1 = {}));


/***/ }),

/***/ "./shared/js/crypto/sha.ts":
/*!*********************************!*\
  !*** ./shared/js/crypto/sha.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, global) {var __WEBPACK_AMD_DEFINE_RESULT__;
Object.defineProperty(exports, "__esModule", { value: true });
var sha;
(function (sha) {
    (function () {
        'use strict';
        let root = typeof window === 'object' ? window : {};
        let NODE_JS = !root.JS_SHA1_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
        if (NODE_JS) {
            root = global;
        }
        let COMMON_JS = !root.JS_SHA1_NO_COMMON_JS && typeof module === 'object' && module.exports;
        let AMD =  true && __webpack_require__(/*! !webpack amd options */ "./node_modules/webpack/buildin/amd-options.js");
        let HEX_CHARS = '0123456789abcdef'.split('');
        let EXTRA = [-2147483648, 8388608, 32768, 128];
        let SHIFT = [24, 16, 8, 0];
        let OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];
        let blocks = [];
        let createOutputMethod = function (outputType) {
            return function (message) {
                return new Sha1(true).update(message)[outputType]();
            };
        };
        let createMethod = function () {
            let method = createOutputMethod('hex');
            if (NODE_JS) {
                method = nodeWrap(method);
            }
            method.create = function () {
                return new Sha1();
            };
            method.update = function (message) {
                return method.create().update(message);
            };
            for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
                var type = OUTPUT_TYPES[i];
                method[type] = createOutputMethod(type);
            }
            return method;
        };
        var nodeWrap = function (method) {
            var crypto = eval("require('crypto')");
            var Buffer = eval("require('buffer').Buffer");
            var nodeMethod = function (message) {
                if (typeof message === 'string') {
                    return crypto.createHash('sha1').update(message, 'utf8').digest('hex');
                }
                else if (message.constructor === ArrayBuffer) {
                    message = new Uint8Array(message);
                }
                else if (message.length === undefined) {
                    return method(message);
                }
                return crypto.createHash('sha1').update(new Buffer(message)).digest('hex');
            };
            return nodeMethod;
        };
        function Sha1(sharedMemory) {
            if (sharedMemory) {
                blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                    blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
                this.blocks = blocks;
            }
            else {
                this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }
            this.h0 = 0x67452301;
            this.h1 = 0xEFCDAB89;
            this.h2 = 0x98BADCFE;
            this.h3 = 0x10325476;
            this.h4 = 0xC3D2E1F0;
            this.block = this.start = this.bytes = this.hBytes = 0;
            this.finalized = this.hashed = false;
            this.first = true;
        }
        Sha1.prototype.update = function (message) {
            if (this.finalized) {
                return;
            }
            var notString = typeof (message) !== 'string';
            if (notString && message.constructor === root.ArrayBuffer) {
                message = new Uint8Array(message);
            }
            var code, index = 0, i, length = message.length || 0, blocks = this.blocks;
            while (index < length) {
                if (this.hashed) {
                    this.hashed = false;
                    blocks[0] = this.block;
                    blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                            blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                                blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
                }
                if (notString) {
                    for (i = this.start; index < length && i < 64; ++index) {
                        blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
                    }
                }
                else {
                    for (i = this.start; index < length && i < 64; ++index) {
                        code = message.charCodeAt(index);
                        if (code < 0x80) {
                            blocks[i >> 2] |= code << SHIFT[i++ & 3];
                        }
                        else if (code < 0x800) {
                            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
                            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                        }
                        else if (code < 0xd800 || code >= 0xe000) {
                            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
                            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                        }
                        else {
                            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
                            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
                            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
                            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                        }
                    }
                }
                this.lastByteIndex = i;
                this.bytes += i - this.start;
                if (i >= 64) {
                    this.block = blocks[16];
                    this.start = i - 64;
                    this.hash();
                    this.hashed = true;
                }
                else {
                    this.start = i;
                }
            }
            if (this.bytes > 4294967295) {
                this.hBytes += this.bytes / 4294967296 << 0;
                this.bytes = this.bytes % 4294967296;
            }
            return this;
        };
        Sha1.prototype.finalize = function () {
            if (this.finalized) {
                return;
            }
            this.finalized = true;
            var blocks = this.blocks, i = this.lastByteIndex;
            blocks[16] = this.block;
            blocks[i >> 2] |= EXTRA[i & 3];
            this.block = blocks[16];
            if (i >= 56) {
                if (!this.hashed) {
                    this.hash();
                }
                blocks[0] = this.block;
                blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                    blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            }
            blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
            blocks[15] = this.bytes << 3;
            this.hash();
        };
        Sha1.prototype.hash = function () {
            var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4;
            var f, j, t, blocks = this.blocks;
            for (j = 16; j < 80; ++j) {
                t = blocks[j - 3] ^ blocks[j - 8] ^ blocks[j - 14] ^ blocks[j - 16];
                blocks[j] = (t << 1) | (t >>> 31);
            }
            for (j = 0; j < 20; j += 5) {
                f = (b & c) | ((~b) & d);
                t = (a << 5) | (a >>> 27);
                e = t + f + e + 1518500249 + blocks[j] << 0;
                b = (b << 30) | (b >>> 2);
                f = (a & b) | ((~a) & c);
                t = (e << 5) | (e >>> 27);
                d = t + f + d + 1518500249 + blocks[j + 1] << 0;
                a = (a << 30) | (a >>> 2);
                f = (e & a) | ((~e) & b);
                t = (d << 5) | (d >>> 27);
                c = t + f + c + 1518500249 + blocks[j + 2] << 0;
                e = (e << 30) | (e >>> 2);
                f = (d & e) | ((~d) & a);
                t = (c << 5) | (c >>> 27);
                b = t + f + b + 1518500249 + blocks[j + 3] << 0;
                d = (d << 30) | (d >>> 2);
                f = (c & d) | ((~c) & e);
                t = (b << 5) | (b >>> 27);
                a = t + f + a + 1518500249 + blocks[j + 4] << 0;
                c = (c << 30) | (c >>> 2);
            }
            for (; j < 40; j += 5) {
                f = b ^ c ^ d;
                t = (a << 5) | (a >>> 27);
                e = t + f + e + 1859775393 + blocks[j] << 0;
                b = (b << 30) | (b >>> 2);
                f = a ^ b ^ c;
                t = (e << 5) | (e >>> 27);
                d = t + f + d + 1859775393 + blocks[j + 1] << 0;
                a = (a << 30) | (a >>> 2);
                f = e ^ a ^ b;
                t = (d << 5) | (d >>> 27);
                c = t + f + c + 1859775393 + blocks[j + 2] << 0;
                e = (e << 30) | (e >>> 2);
                f = d ^ e ^ a;
                t = (c << 5) | (c >>> 27);
                b = t + f + b + 1859775393 + blocks[j + 3] << 0;
                d = (d << 30) | (d >>> 2);
                f = c ^ d ^ e;
                t = (b << 5) | (b >>> 27);
                a = t + f + a + 1859775393 + blocks[j + 4] << 0;
                c = (c << 30) | (c >>> 2);
            }
            for (; j < 60; j += 5) {
                f = (b & c) | (b & d) | (c & d);
                t = (a << 5) | (a >>> 27);
                e = t + f + e - 1894007588 + blocks[j] << 0;
                b = (b << 30) | (b >>> 2);
                f = (a & b) | (a & c) | (b & c);
                t = (e << 5) | (e >>> 27);
                d = t + f + d - 1894007588 + blocks[j + 1] << 0;
                a = (a << 30) | (a >>> 2);
                f = (e & a) | (e & b) | (a & b);
                t = (d << 5) | (d >>> 27);
                c = t + f + c - 1894007588 + blocks[j + 2] << 0;
                e = (e << 30) | (e >>> 2);
                f = (d & e) | (d & a) | (e & a);
                t = (c << 5) | (c >>> 27);
                b = t + f + b - 1894007588 + blocks[j + 3] << 0;
                d = (d << 30) | (d >>> 2);
                f = (c & d) | (c & e) | (d & e);
                t = (b << 5) | (b >>> 27);
                a = t + f + a - 1894007588 + blocks[j + 4] << 0;
                c = (c << 30) | (c >>> 2);
            }
            for (; j < 80; j += 5) {
                f = b ^ c ^ d;
                t = (a << 5) | (a >>> 27);
                e = t + f + e - 899497514 + blocks[j] << 0;
                b = (b << 30) | (b >>> 2);
                f = a ^ b ^ c;
                t = (e << 5) | (e >>> 27);
                d = t + f + d - 899497514 + blocks[j + 1] << 0;
                a = (a << 30) | (a >>> 2);
                f = e ^ a ^ b;
                t = (d << 5) | (d >>> 27);
                c = t + f + c - 899497514 + blocks[j + 2] << 0;
                e = (e << 30) | (e >>> 2);
                f = d ^ e ^ a;
                t = (c << 5) | (c >>> 27);
                b = t + f + b - 899497514 + blocks[j + 3] << 0;
                d = (d << 30) | (d >>> 2);
                f = c ^ d ^ e;
                t = (b << 5) | (b >>> 27);
                a = t + f + a - 899497514 + blocks[j + 4] << 0;
                c = (c << 30) | (c >>> 2);
            }
            this.h0 = this.h0 + a << 0;
            this.h1 = this.h1 + b << 0;
            this.h2 = this.h2 + c << 0;
            this.h3 = this.h3 + d << 0;
            this.h4 = this.h4 + e << 0;
        };
        Sha1.prototype.hex = function () {
            this.finalize();
            var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;
            return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
                HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
                HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
                HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
                HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
                HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
                HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
                HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
                HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
                HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
                HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
                HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
                HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
                HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
                HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
                HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
                HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
                HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
                HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
                HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F];
        };
        Sha1.prototype.toString = Sha1.prototype.hex;
        Sha1.prototype.digest = function () {
            this.finalize();
            var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;
            return [
                (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
                (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
                (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
                (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
                (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF
            ];
        };
        Sha1.prototype.array = Sha1.prototype.digest;
        Sha1.prototype.arrayBuffer = function () {
            this.finalize();
            var buffer = new ArrayBuffer(20);
            var dataView = new DataView(buffer);
            dataView.setUint32(0, this.h0);
            dataView.setUint32(4, this.h1);
            dataView.setUint32(8, this.h2);
            dataView.setUint32(12, this.h3);
            dataView.setUint32(16, this.h4);
            return buffer;
        };
        var exports = createMethod();
        if (COMMON_JS) {
            module.exports = exports;
        }
        else {
            root._sha1 = exports;
            if (AMD) {
                !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
                    return exports;
                }).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
            }
        }
    })();
    function encode_text(buffer) {
        if (window.TextEncoder) {
            return new TextEncoder().encode(buffer).buffer;
        }
        let utf8 = unescape(encodeURIComponent(buffer));
        let result = new Uint8Array(utf8.length);
        for (let i = 0; i < utf8.length; i++) {
            result[i] = utf8.charCodeAt(i);
        }
        return result.buffer;
    }
    sha.encode_text = encode_text;
    function sha1(message) {
        if (!(typeof (message) === "string" || message instanceof ArrayBuffer))
            throw "Invalid type!";
        let buffer = message instanceof ArrayBuffer ? message : encode_text(message);
        if (!crypto || !crypto.subtle || !crypto.subtle.digest || /Edge/.test(navigator.userAgent))
            return new Promise(resolve => {
                resolve(_sha1.arrayBuffer(buffer));
            });
        else
            return crypto.subtle.digest("SHA-1", buffer);
    }
    sha.sha1 = sha1;
})(sha = exports.sha || (exports.sha = {}));

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../node_modules/process/browser.js */ "./node_modules/process/browser.js"), __webpack_require__(/*! ./../../../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./shared/js/crypto/uid.ts":
/*!*********************************!*\
  !*** ./shared/js/crypto/uid.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
exports.guid = guid;


/***/ }),

/***/ "./shared/js/i18n/localize.ts":
/*!************************************!*\
  !*** ./shared/js/i18n/localize.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const uid_1 = __webpack_require__(/*! ../crypto/uid */ "./shared/js/crypto/uid.ts");
const log_1 = __webpack_require__(/*! ../log */ "./shared/js/log.ts");
const chat_1 = __webpack_require__(/*! ../ui/frames/chat */ "./shared/js/ui/frames/chat.ts");
const settings_1 = __webpack_require__(/*! ../settings */ "./shared/js/settings.ts");
const modal_1 = __webpack_require__(/*! ../ui/elements/modal */ "./shared/js/ui/elements/modal.ts");
var i18n;
(function (i18n) {
    let translations = [];
    let fast_translate = {};
    function tr(message, key) {
        const sloppy = fast_translate[message];
        if (sloppy)
            return sloppy;
        log_1.log.info(log_1.LogCategory.I18N, "Translating \"%s\". Default: \"%s\"", key, message);
        let translated = message;
        for (const translation of translations) {
            if (translation.key.message == message) {
                translated = translation.translated;
                break;
            }
        }
        fast_translate[message] = translated;
        return translated;
    }
    i18n.tr = tr;
    function tra(message, ...args) {
        message = tr(message);
        return chat_1.MessageHelper.formatMessage(message, ...args);
    }
    i18n.tra = tra;
    function load_translation_file(url, path) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: url,
                    async: true,
                    success: result => {
                        try {
                            const file = (typeof (result) === "string" ? JSON.parse(result) : result);
                            if (!file) {
                                reject("Invalid json");
                                return;
                            }
                            file.full_url = url;
                            file.path = path;
                            resolve(file);
                        }
                        catch (error) {
                            log_1.log.warn(log_1.LogCategory.I18N, tr("Failed to load translation file %s. Failed to parse or process json: %o"), url, error);
                            reject(tr("Failed to process or parse json!"));
                        }
                    },
                    error: (xhr, error) => {
                        reject(tr("Failed to load file: ") + error);
                    }
                });
            });
        });
    }
    function load_file(url, path) {
        return load_translation_file(url, path).then((result) => __awaiter(this, void 0, void 0, function* () {
            try {
                tr("Dummy translation test");
            }
            catch (error) {
                throw "dummy test failed";
            }
            log_1.log.info(log_1.LogCategory.I18N, tr("Successfully initialized up translation file from %s"), url);
            translations = result.translations;
        })).catch(error => {
            log_1.log.warn(log_1.LogCategory.I18N, tr("Failed to load translation file from \"%s\". Error: %o"), url, error);
            return Promise.reject(error);
        });
    }
    i18n.load_file = load_file;
    function load_repository0(repo, reload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!repo.load_timestamp || repo.load_timestamp < 1000 || reload) {
                const info_json = yield new Promise((resolve, reject) => {
                    $.ajax({
                        url: repo.url + "/info.json",
                        async: true,
                        cache: !reload,
                        success: result => {
                            const file = (typeof (result) === "string" ? JSON.parse(result) : result);
                            if (!file) {
                                reject("Invalid json");
                                return;
                            }
                            resolve(file);
                        },
                        error: (xhr, error) => {
                            reject(tr("Failed to load file: ") + error);
                        }
                    });
                });
                Object.assign(repo, info_json);
            }
            if (!repo.unique_id)
                repo.unique_id = uid_1.guid();
            repo.translations = repo.translations || [];
            repo.load_timestamp = Date.now();
        });
    }
    function load_repository(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = {};
            result.url = url;
            yield load_repository0(result, false);
            return result;
        });
    }
    i18n.load_repository = load_repository;
    let config;
    (function (config_1) {
        const repository_config_key = "i18n.repository";
        let _cached_repository_config;
        function repository_config() {
            if (_cached_repository_config)
                return _cached_repository_config;
            const config_string = localStorage.getItem(repository_config_key);
            let config;
            try {
                config = config_string ? JSON.parse(config_string) : {};
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.I18N, tr("Failed to parse repository config: %o"), error);
            }
            config.repositories = config.repositories || [];
            for (const repo of config.repositories)
                (repo.repository || { load_timestamp: 0 }).load_timestamp = 0;
            if (config.repositories.length == 0) {
                load_repository(settings_1.StaticSettings.instance.static("i18n.default_repository", "https://web.teaspeak.de/i18n/")).then(repo => {
                    log_1.log.info(log_1.LogCategory.I18N, tr("Successfully added default repository from \"%s\"."), repo.url);
                    register_repository(repo);
                }).catch(error => {
                    log_1.log.warn(log_1.LogCategory.I18N, tr("Failed to add default repository. Error: %o"), error);
                });
            }
            return _cached_repository_config = config;
        }
        config_1.repository_config = repository_config;
        function save_repository_config() {
            localStorage.setItem(repository_config_key, JSON.stringify(_cached_repository_config));
        }
        config_1.save_repository_config = save_repository_config;
        const translation_config_key = "i18n.translation";
        let _cached_translation_config;
        function translation_config() {
            if (_cached_translation_config)
                return _cached_translation_config;
            const config_string = localStorage.getItem(translation_config_key);
            try {
                _cached_translation_config = config_string ? JSON.parse(config_string) : {};
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.I18N, tr("Failed to initialize translation config. Using default one. Error: %o"), error);
                _cached_translation_config = {};
            }
            return _cached_translation_config;
        }
        config_1.translation_config = translation_config;
        function save_translation_config() {
            localStorage.setItem(translation_config_key, JSON.stringify(_cached_translation_config));
        }
        config_1.save_translation_config = save_translation_config;
    })(config = i18n.config || (i18n.config = {}));
    function register_repository(repository) {
        if (!repository)
            return;
        for (const repo of config.repository_config().repositories)
            if (repo.url == repository.url)
                return;
        config.repository_config().repositories.push(repository);
        config.save_repository_config();
    }
    i18n.register_repository = register_repository;
    function registered_repositories() {
        return config.repository_config().repositories.map(e => e.repository || { url: e.url, load_timestamp: 0 });
    }
    i18n.registered_repositories = registered_repositories;
    function delete_repository(repository) {
        if (!repository)
            return;
        for (const repo of [...config.repository_config().repositories])
            if (repo.url == repository.url) {
                config.repository_config().repositories.remove(repo);
            }
        config.save_repository_config();
    }
    i18n.delete_repository = delete_repository;
    function iterate_repositories(callback_entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            for (const repository of registered_repositories()) {
                promises.push(load_repository0(repository, false).then(() => callback_entry(repository)).catch(error => {
                    log_1.log.warn(log_1.LogCategory.I18N, "Failed to fetch repository %s. error: %o", repository.url, error);
                }));
            }
            yield Promise.all(promises);
        });
    }
    i18n.iterate_repositories = iterate_repositories;
    function select_translation(repository, entry) {
        const cfg = config.translation_config();
        if (entry && repository) {
            cfg.current_language = entry.name;
            cfg.current_repository_url = repository.url;
            cfg.current_translation_url = repository.url + entry.path;
            cfg.current_translation_path = entry.path;
        }
        else {
            cfg.current_language = undefined;
            cfg.current_repository_url = undefined;
            cfg.current_translation_url = undefined;
            cfg.current_translation_path = undefined;
        }
        config.save_translation_config();
    }
    i18n.select_translation = select_translation;
    function initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const rcfg = config.repository_config();
            const cfg = config.translation_config();
            if (cfg.current_translation_url) {
                try {
                    yield load_file(cfg.current_translation_url, cfg.current_translation_path);
                }
                catch (error) {
                    console.error(tr("Failed to initialize selected translation: %o"), error);
                    const show_error = () => {
                        modal_1.createErrorModal(tr("Translation System"), tra("Failed to load current selected translation file.{:br:}File: {0}{:br:}Error: {1}{:br:}{:br:}Using default fallback translations.", cfg.current_translation_url, error)).open();
                    };
                    if (loader.running())
                        loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
                            priority: 10,
                            function: () => __awaiter(this, void 0, void 0, function* () { return show_error(); }),
                            name: "I18N error display"
                        });
                    else
                        show_error();
                }
            }
        });
    }
    i18n.initialize = initialize;
})(i18n = exports.i18n || (exports.i18n = {}));
const tr = i18n.tr;
const tra = i18n.tra;
window.tr = i18n.tr;
window.tra = i18n.tra;


/***/ }),

/***/ "./shared/js/log.ts":
/*!**************************!*\
  !*** ./shared/js/log.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

throw new Error("Module parse failed: Binding arguments in strict mode (151:43)\nFile was processed with these loaders:\n * ./node_modules/ts-loader/index.js\nYou may need an additional loader to handle the result of these loaders.\n|     }\n|     log_1.group = group;\n>     function table(level, category, title, arguments) {\n|         if (group_mode == GroupMode.NATIVE) {\n|             console.groupCollapsed(title);");

/***/ }),

/***/ "./shared/js/main.ts":
/*!***************************!*\
  !*** ./shared/js/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var spawnYesNo = ModalConnect_1.Modals.spawnYesNo;
const BrowserIPC_1 = __webpack_require__(/*! ./BrowserIPC */ "./shared/js/BrowserIPC.ts");
const log_1 = __webpack_require__(/*! ./log */ "./shared/js/log.ts");
const ConnectionProfile_1 = __webpack_require__(/*! ./profiles/ConnectionProfile */ "./shared/js/profiles/ConnectionProfile.ts");
const ModalConnect_1 = __webpack_require__(/*! ./ui/modal/ModalConnect */ "./shared/js/ui/modal/ModalConnect.ts");
const settings_1 = __webpack_require__(/*! ./settings */ "./shared/js/settings.ts");
const localize_1 = __webpack_require__(/*! ./i18n/localize */ "./shared/js/i18n/localize.ts");
const modal_1 = __webpack_require__(/*! ./ui/elements/modal */ "./shared/js/ui/elements/modal.ts");
const chat_1 = __webpack_require__(/*! ./ui/frames/chat */ "./shared/js/ui/frames/chat.ts");
exports.js_render = window.jsrender || $;
exports.native_client = window.require !== undefined;
function getUserMediaFunctionPromise() {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)
        return constraints => navigator.mediaDevices.getUserMedia(constraints);
    const _callbacked_function = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!_callbacked_function)
        return undefined;
    return constraints => new Promise((resolve, reject) => _callbacked_function(constraints, resolve, reject));
}
exports.getUserMediaFunctionPromise = getUserMediaFunctionPromise;
function setup_close() {
    window.onbeforeunload = event => {
        if (ConnectionProfile_1.profiles.requires_save())
            ConnectionProfile_1.profiles.save();
        if (!settings_1.settings.static(settings_1.Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) {
            const active_connections = server_connections.server_connection_handlers().filter(e => e.connected);
            if (active_connections.length == 0)
                return;
            if (!exports.native_client) {
                event.returnValue = "Are you really sure?<br>You're still connected!";
            }
            else {
                const do_exit = () => {
                    const dp = server_connections.server_connection_handlers().map(e => {
                        if (e.serverConnection.connected())
                            return e.serverConnection.disconnect(tr("client closed"));
                        return Promise.resolve();
                    }).map(e => e.catch(error => {
                        console.warn(tr("Failed to disconnect from server on client close: %o"), e);
                    }));
                    const exit = () => {
                        const { remote } = exports.nodeRequire('electron');
                        remote.getCurrentWindow().close();
                    };
                    Promise.all(dp).then(exit);
                    setTimeout(exit, 2500);
                };
                if (window.open_connected_question) {
                    event.preventDefault();
                    event.returnValue = "question";
                    window.open_connected_question().then(result => {
                        if (result) {
                            window.onbeforeunload = e => e.preventDefault();
                            setTimeout(() => window.onbeforeunload, 5000);
                            do_exit();
                        }
                    });
                }
                else {
                    do_exit();
                }
            }
        }
    };
}
exports.setup_close = setup_close;
function setup_jsrender() {
    if (!exports.js_render) {
        loader.critical_error("Missing jsrender extension!");
        return false;
    }
    if (!exports.js_render.views) {
        loader.critical_error("Missing jsrender viewer extension!");
        return false;
    }
    exports.js_render.views.settings.allowCode(true);
    exports.js_render.views.tags("rnd", (argument) => {
        let min = parseInt(argument.substr(0, argument.indexOf('~')));
        let max = parseInt(argument.substr(argument.indexOf('~') + 1));
        return (Math.round(Math.random() * (min + max + 1) - min)).toString();
    });
    exports.js_render.views.tags("fmt_date", (...args) => {
        return moment(args[0]).format(args[1]);
    });
    exports.js_render.views.tags("tr", (...args) => {
        return tr(args[0]);
    });
    $(".jsrender-template").each((idx, _entry) => {
        if (!exports.js_render.templates(_entry.id, _entry.innerHTML)) {
            log_1.log.error(log_1.LogCategory.GENERAL, tr("Failed to setup cache for js renderer template %s!"), _entry.id);
        }
        else
            log_1.log.info(log_1.LogCategory.GENERAL, tr("Successfully loaded jsrender template %s"), _entry.id);
    });
    return true;
}
exports.setup_jsrender = setup_jsrender;
function initialize() {
    return __awaiter(this, void 0, void 0, function* () {
        settings_1.Settings.initialize();
        try {
            yield localize_1.i18n.initialize();
        }
        catch (error) {
            console.error(tr("Failed to initialized the translation system!\nError: %o"), error);
            loader.critical_error("Failed to setup the translation system");
            return;
        }
        BrowserIPC_1.bipc.setup();
    });
}
exports.initialize = initialize;
function initialize_app() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const main = $("#tmpl_main").renderTag({
                multi_session: !settings_1.settings.static_global(settings_1.Settings.KEY_DISABLE_MULTI_SESSION),
                app_version: app.ui_version()
            }).dividerfy();
            $("body").append(main);
        }
        catch (error) {
            log_1.log.error(log_1.LogCategory.GENERAL, error);
            loader.critical_error(tr("Failed to setup main page!"));
            return;
        }
        control_bar = new ControlBar($("#control_bar"));
        if (!audio.player.initialize())
            console.warn(tr("Failed to initialize audio controller!"));
        audio.player.on_ready(() => {
            if (audio.player.set_master_volume)
                audio.player.on_ready(() => audio.player.set_master_volume(settings_1.settings.global(settings_1.Settings.KEY_SOUND_MASTER) / 100));
            else
                log_1.log.warn(log_1.LogCategory.GENERAL, tr("Client does not support audio.player.set_master_volume()... May client is too old?"));
            if (audio.recorder.device_refresh_available())
                audio.recorder.refresh_devices();
        });
        default_recorder = new RecorderProfile("default");
        default_recorder.initialize().catch(error => {
            log_1.log.error(log_1.LogCategory.AUDIO, tr("Failed to initialize default recorder: %o"), error);
        });
        sound.initialize().then(() => {
            log_1.log.info(log_1.LogCategory.AUDIO, tr("Sounds initialized"));
        });
        sound.set_master_volume(settings_1.settings.global(settings_1.Settings.KEY_SOUND_MASTER_SOUNDS) / 100);
        yield ConnectionProfile_1.profiles.load();
        try {
            yield ppt.initialize();
        }
        catch (error) {
            log_1.log.error(log_1.LogCategory.GENERAL, tr("Failed to initialize ppt!\nError: %o"), error);
            loader.critical_error(tr("Failed to initialize ppt!"));
            return;
        }
        setup_close();
    });
}
exports.initialize_app = initialize_app;
function str2ab8(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
exports.str2ab8 = str2ab8;
function arrayBufferBase64(base64) {
    base64 = atob(base64);
    const buf = new ArrayBuffer(base64.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = base64.length; i < strLen; i++) {
        bufView[i] = base64.charCodeAt(i);
    }
    return buf;
}
exports.arrayBufferBase64 = arrayBufferBase64;
function base64_encode_ab(source) {
    const encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64 = "";
    const bytes = new Uint8Array(source);
    const byte_length = bytes.byteLength;
    const byte_reminder = byte_length % 3;
    const main_length = byte_length - byte_reminder;
    let a, b, c, d;
    let chunk;
    for (let i = 0; i < main_length; i = i + 3) {
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        a = (chunk & 16515072) >> 18;
        b = (chunk & 258048) >> 12;
        c = (chunk & 4032) >> 6;
        d = (chunk & 63) >> 0;
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }
    if (byte_reminder == 1) {
        chunk = bytes[main_length];
        a = (chunk & 252) >> 2;
        b = (chunk & 3) << 4;
        base64 += encodings[a] + encodings[b] + '==';
    }
    else if (byte_reminder == 2) {
        chunk = (bytes[main_length] << 8) | bytes[main_length + 1];
        a = (chunk & 64512) >> 10;
        b = (chunk & 1008) >> 4;
        c = (chunk & 15) << 2;
        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }
    return base64;
}
exports.base64_encode_ab = base64_encode_ab;
function handle_connect_request(properties, connection) {
    const profile_uuid = properties.profile || (ConnectionProfile_1.profiles.default_profile() || { id: 'default' }).id;
    const profile = ConnectionProfile_1.profiles.find_profile(profile_uuid) || ConnectionProfile_1.profiles.default_profile();
    const username = properties.username || profile.connect_username();
    const password = properties.password ? properties.password.value : "";
    const password_hashed = properties.password ? properties.password.hashed : false;
    if (profile && profile.valid()) {
        connection.startConnection(properties.address, profile, true, {
            nickname: username,
            password: password.length > 0 ? {
                password: password,
                hashed: password_hashed
            } : undefined
        });
        server_connections.set_active_connection_handler(connection);
    }
    else {
        ModalConnect_1.Modals.spawnConnectModal({}, {
            url: properties.address,
            enforce: true
        }, {
            profile: profile,
            enforce: true
        });
    }
}
function main() {
    {
        const font = settings_1.settings.static_global(settings_1.Settings.KEY_FONT_SIZE, 14);
        $(document.body).css("font-size", font + "px");
    }
    $(document).on('contextmenu', event => {
        if (event.isDefaultPrevented())
            return;
        if (!settings_1.settings.static_global(settings_1.Settings.KEY_DISABLE_GLOBAL_CONTEXT_MENU))
            event.preventDefault();
    });
    top_menu.initialize();
    server_connections = new ServerConnectionManager($("#connection-handlers"));
    control_bar.initialise();
    const initial_handler = server_connections.spawn_server_connection_handler();
    initial_handler.acquire_recorder(default_recorder, false);
    control_bar.set_connection_handler(initial_handler);
    ConnectionProfile_1.profiles.identities.update_forum();
    let _resize_timeout;
    $(window).on('resize', event => {
        if (event.target !== window)
            return;
        if (_resize_timeout)
            clearTimeout(_resize_timeout);
        _resize_timeout = setTimeout(() => {
            for (const connection of server_connections.server_connection_handlers())
                connection.invoke_resized_on_activate = true;
            const active_connection = server_connections.active_connection_handler();
            if (active_connection)
                active_connection.resize_elements();
            $(".window-resize-listener").trigger('resize');
        }, 1000);
    });
    stats.initialize({
        verbose: true,
        anonymize_ip_addresses: true,
        volatile_collection_only: false
    });
    stats.register_user_count_listener(status => {
        log_1.log.info(log_1.LogCategory.STATISTICS, tr("Received user count update: %o"), status);
    });
    server_connections.set_active_connection_handler(server_connections.server_connection_handlers()[0]);
    window.test_upload = (message) => {
        message = message || "Hello World";
        const connection = server_connections.active_connection_handler();
        connection.fileManager.upload_file({
            size: message.length,
            overwrite: true,
            channel: connection.getClient().currentChannel(),
            name: '/HelloWorld.txt',
            path: ''
        }).then(key => {
            const upload = new RequestFileUpload(key);
            const buffer = new Uint8Array(message.length);
            {
                for (let index = 0; index < message.length; index++)
                    buffer[index] = message.charCodeAt(index);
            }
            upload.put_data(buffer).catch(error => {
                console.error(error);
            });
        });
    };
    setTimeout(() => {
        const connection = server_connections.active_connection_handler();
    }, 4000);
    if (settings_1.settings.static_global(settings_1.Settings.KEY_USER_IS_NEW)) {
        const modal = ModalConnect_1.Modals.openModalNewcomer();
        modal.close_listener.push(() => settings_1.settings.changeGlobal(settings_1.Settings.KEY_USER_IS_NEW, false));
    }
}
const task_teaweb_starter = {
    name: "voice app starter",
    function: () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield initialize_app();
            main();
            if (!audio.player.initialized()) {
                log_1.log.info(log_1.LogCategory.VOICE, tr("Initialize audio controller later!"));
                if (!audio.player.initializeFromGesture) {
                    console.error(tr("Missing audio.player.initializeFromGesture"));
                }
                else
                    $(document).one('click', event => audio.player.initializeFromGesture());
            }
        }
        catch (ex) {
            console.error(ex.stack);
            if (ex instanceof ReferenceError || ex instanceof TypeError)
                ex = ex.name + ": " + ex.message;
            loader.critical_error("Failed to invoke main function:<br>" + ex);
        }
    }),
    priority: 10
};
const task_connect_handler = {
    name: "Connect handler",
    function: () => __awaiter(void 0, void 0, void 0, function* () {
        const address = settings_1.settings.static(settings_1.Settings.KEY_CONNECT_ADDRESS, "");
        const chandler = BrowserIPC_1.bipc.get_connect_handler();
        if (settings_1.settings.static(settings_1.Settings.KEY_FLAG_CONNECT_DEFAULT, false) && address) {
            const connect_data = {
                address: address,
                profile: settings_1.settings.static(settings_1.Settings.KEY_CONNECT_PROFILE, ""),
                username: settings_1.settings.static(settings_1.Settings.KEY_CONNECT_USERNAME, ""),
                password: {
                    value: settings_1.settings.static(settings_1.Settings.KEY_CONNECT_PASSWORD, ""),
                    hashed: settings_1.settings.static(settings_1.Settings.KEY_FLAG_CONNECT_PASSWORD, false)
                }
            };
            if (chandler) {
                try {
                    yield chandler.post_connect_request(connect_data, () => new Promise((resolve, reject) => {
                        spawnYesNo(tr("Another TeaWeb instance is already running"), tra("Another TeaWeb instance is already running.{:br:}Would you like to connect there?"), response => {
                            resolve(response);
                        }, {
                            closeable: false
                        }).open();
                    }));
                    log_1.log.info(log_1.LogCategory.CLIENT, tr("Executed connect successfully in another browser window. Closing this window"));
                    const message = "You're connecting to {0} within the other TeaWeb instance.{:br:}" +
                        "You could now close this page.";
                    modal_1.createInfoModal(tr("Connecting successfully within other instance"), chat_1.MessageHelper.formatMessage(tr(message), connect_data.address), {
                        closeable: false,
                        footer: undefined
                    }).open();
                    return;
                }
                catch (error) {
                    log_1.log.info(log_1.LogCategory.CLIENT, tr("Failed to execute connect within other TeaWeb instance. Using this one. Error: %o"), error);
                }
            }
            loader.register_task(loader.Stage.LOADED, {
                priority: 0,
                function: () => __awaiter(void 0, void 0, void 0, function* () { return handle_connect_request(connect_data, server_connections.active_connection_handler() || server_connections.spawn_server_connection_handler()); }),
                name: tr("default url connect")
            });
        }
        if (chandler) {
            chandler.callback_available = data => {
                return !settings_1.settings.static_global(settings_1.Settings.KEY_DISABLE_MULTI_SESSION);
            };
            chandler.callback_execute = data => {
                handle_connect_request(data, server_connections.spawn_server_connection_handler());
                return true;
            };
        }
        loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
    }),
    priority: 10
};
const task_certificate_callback = {
    name: "certificate accept tester",
    function: () => __awaiter(void 0, void 0, void 0, function* () {
        const certificate_accept = settings_1.settings.static_global(settings_1.Settings.KEY_CERTIFICATE_CALLBACK, undefined);
        if (certificate_accept) {
            log_1.log.info(log_1.LogCategory.IPC, tr("Using this instance as certificate callback. ID: %s"), certificate_accept);
            try {
                try {
                    yield BrowserIPC_1.bipc.get_handler().post_certificate_accpected(certificate_accept);
                }
                catch (e) { }
                log_1.log.info(log_1.LogCategory.IPC, tr("Other instance has acknowledged out work. Closing this window."));
                const seconds_tag = $.spawn("a");
                let seconds = 5;
                let interval_id;
                interval_id = setInterval(() => {
                    seconds--;
                    seconds_tag.text(seconds.toString());
                    if (seconds <= 0) {
                        clearTimeout(interval_id);
                        log_1.log.info(log_1.LogCategory.GENERAL, tr("Closing window"));
                        window.close();
                        return;
                    }
                }, 1000);
                const message = "You've successfully accepted the certificate.{:br:}" +
                    "This page will close in {0} seconds.";
                modal_1.createInfoModal(tr("Certificate acccepted successfully"), chat_1.MessageHelper.formatMessage(tr(message), seconds_tag), {
                    closeable: false,
                    footer: undefined
                }).open();
                return;
            }
            catch (error) {
                log_1.log.warn(log_1.LogCategory.IPC, tr("Failed to successfully post certificate accept status: %o"), error);
            }
        }
        else {
            log_1.log.info(log_1.LogCategory.IPC, tr("We're not used to accept certificated. Booting app."));
        }
        loader.register_task(loader.Stage.LOADED, task_connect_handler);
    }),
    priority: 10
};
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "jrendere initialize",
    function: () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!setup_jsrender())
                throw "invalid load";
        }
        catch (error) {
            loader.critical_error(tr("Failed to setup jsrender"));
            console.error(tr("Failed to load jsrender! %o"), error);
            return;
        }
    }),
    priority: 100
});
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "app starter",
    function: () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield initialize();
            if (app.is_web()) {
                loader.register_task(loader.Stage.LOADED, task_certificate_callback);
            }
            else {
                loader.register_task(loader.Stage.LOADED, task_teaweb_starter);
            }
        }
        catch (ex) {
            if (ex instanceof Error || typeof (ex.stack) !== "undefined")
                console.error((tr || (msg => msg))("Critical error stack trace: %o"), ex.stack);
            if (ex instanceof ReferenceError || ex instanceof TypeError)
                ex = ex.name + ": " + ex.message;
            loader.critical_error("Failed to boot app function:<br>" + ex);
        }
    }),
    priority: 1000
});


/***/ }),

/***/ "./shared/js/profiles/ConnectionProfile.ts":
/*!*************************************************!*\
  !*** ./shared/js/profiles/ConnectionProfile.ts ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_1 = __webpack_require__(/*! ../ui/frames/chat */ "./shared/js/ui/frames/chat.ts");
const modal_1 = __webpack_require__(/*! ../ui/elements/modal */ "./shared/js/ui/elements/modal.ts");
const uid_1 = __webpack_require__(/*! ../crypto/uid */ "./shared/js/crypto/uid.ts");
const Identity_1 = __webpack_require__(/*! ./Identity */ "./shared/js/profiles/Identity.ts");
const TeaForumIdentity_1 = __webpack_require__(/*! ./identities/TeaForumIdentity */ "./shared/js/profiles/identities/TeaForumIdentity.ts");
const TeamSpeakIdentity_1 = __webpack_require__(/*! ./identities/TeamSpeakIdentity */ "./shared/js/profiles/identities/TeamSpeakIdentity.ts");
class ConnectionProfile {
    constructor(id) {
        this.selected_identity_type = "unset";
        this.identities = {};
        this.id = id;
    }
    connect_username() {
        if (this.default_username && this.default_username !== "Another TeaSpeak user")
            return this.default_username;
        let selected = this.selected_identity();
        let name = selected ? selected.fallback_name() : undefined;
        return name || "Another TeaSpeak user";
    }
    selected_identity(current_type) {
        if (!current_type)
            current_type = this.selected_type();
        if (current_type === undefined)
            return undefined;
        if (current_type == Identity_1.IdentitifyType.TEAFORO) {
            return TeaForumIdentity_1.static_forum_identity();
        }
        else if (current_type == Identity_1.IdentitifyType.TEAMSPEAK || current_type == Identity_1.IdentitifyType.NICKNAME) {
            return this.identities[Identity_1.IdentitifyType[current_type].toLowerCase()];
        }
        return undefined;
    }
    selected_type() {
        return this.selected_identity_type ? Identity_1.IdentitifyType[this.selected_identity_type.toUpperCase()] : undefined;
    }
    set_identity(type, identity) {
        this.identities[Identity_1.IdentitifyType[type].toLowerCase()] = identity;
    }
    spawn_identity_handshake_handler(connection) {
        const identity = this.selected_identity();
        if (!identity)
            return undefined;
        return identity.spawn_identity_handshake_handler(connection);
    }
    encode() {
        const identity_data = {};
        for (const key in this.identities)
            if (this.identities[key])
                identity_data[key] = this.identities[key].encode();
        return JSON.stringify({
            version: 1,
            username: this.default_username,
            password: this.default_password,
            profile_name: this.profile_name,
            identity_type: this.selected_identity_type,
            identity_data: identity_data,
            id: this.id
        });
    }
    valid() {
        const identity = this.selected_identity();
        if (!identity || !identity.valid())
            return false;
        return true;
    }
}
exports.ConnectionProfile = ConnectionProfile;
function decode_profile(data) {
    return __awaiter(this, void 0, void 0, function* () {
        data = JSON.parse(data);
        if (data.version !== 1)
            return "invalid version";
        const result = new ConnectionProfile(data.id);
        result.default_username = data.username;
        result.default_password = data.password;
        result.profile_name = data.profile_name;
        result.selected_identity_type = (data.identity_type || "").toLowerCase();
        if (data.identity_data) {
            for (const key in data.identity_data) {
                const type = Identity_1.IdentitifyType[key.toUpperCase()];
                const _data = data.identity_data[key];
                if (type == undefined)
                    continue;
                const identity = yield Identity_1.decode_identity(type, _data);
                if (identity == undefined)
                    continue;
                result.identities[key.toLowerCase()] = identity;
            }
        }
        return result;
    });
}
let available_profiles = [];
function load() {
    return __awaiter(this, void 0, void 0, function* () {
        available_profiles = [];
        const profiles_json = localStorage.getItem("profiles");
        let profiles_data = (() => {
            try {
                return profiles_json ? JSON.parse(profiles_json) : { version: 0 };
            }
            catch (error) {
                debugger;
                console.error(tr("Invalid profile json! Resetting profiles :( (%o)"), profiles_json);
                modal_1.createErrorModal(tr("Profile data invalid"), chat_1.MessageHelper.formatMessage(tr("The profile data is invalid.{:br:}This might cause data loss."))).open();
                return { version: 0 };
            }
        })();
        if (profiles_data.version === 0) {
            profiles_data = {
                version: 1,
                profiles: []
            };
        }
        if (profiles_data.version == 1) {
            for (const profile_data of profiles_data.profiles) {
                const profile = yield decode_profile(profile_data);
                if (typeof (profile) === 'string') {
                    console.error(tr("Failed to load profile. Reason: %s, Profile data: %s"), profile, profiles_data);
                    continue;
                }
                available_profiles.push(profile);
            }
        }
        if (!find_profile("default")) {
            {
                const profile = create_new_profile("default", "default");
                profile.default_password = "";
                profile.default_username = "";
                profile.profile_name = "Default Profile";
                try {
                    const identity = yield TeamSpeakIdentity_1.TeaSpeakIdentity.generate_new();
                    let active = true;
                    setTimeout(() => {
                        active = false;
                    }, 1000);
                    yield identity.improve_level(8, 1, () => active);
                    profile.set_identity(Identity_1.IdentitifyType.TEAMSPEAK, identity);
                    profile.selected_identity_type = Identity_1.IdentitifyType[Identity_1.IdentitifyType.TEAMSPEAK];
                }
                catch (error) {
                    modal_1.createErrorModal(tr("Failed to generate default identity"), tr("Failed to generate default identity!<br>Please manually generate the identity within your settings => profiles")).open();
                }
            }
            {
                const profile = create_new_profile("TeaSpeak Forum", "teaforo");
                profile.default_password = "";
                profile.default_username = "";
                profile.profile_name = "TeaSpeak Forum profile";
                profile.set_identity(Identity_1.IdentitifyType.TEAFORO, TeaForumIdentity_1.static_forum_identity());
                profile.selected_identity_type = Identity_1.IdentitifyType[Identity_1.IdentitifyType.TEAFORO];
            }
            save();
        }
    });
}
exports.load = load;
function create_new_profile(name, id) {
    const profile = new ConnectionProfile(id || uid_1.guid());
    profile.profile_name = name;
    profile.default_username = "";
    available_profiles.push(profile);
    return profile;
}
exports.create_new_profile = create_new_profile;
let _requires_save = false;
function save() {
    const profiles = [];
    for (const profile of available_profiles)
        profiles.push(profile.encode());
    const data = JSON.stringify({
        version: 1,
        profiles: profiles
    });
    localStorage.setItem("profiles", data);
}
exports.save = save;
function mark_need_save() {
    _requires_save = true;
}
exports.mark_need_save = mark_need_save;
function requires_save() {
    return _requires_save;
}
exports.requires_save = requires_save;
function profiles() {
    return available_profiles;
}
exports.profiles = profiles;
function find_profile(id) {
    for (const profile of profiles())
        if (profile.id == id)
            return profile;
    return undefined;
}
exports.find_profile = find_profile;
function find_profile_by_name(name) {
    name = name.toLowerCase();
    for (const profile of profiles())
        if ((profile.profile_name || "").toLowerCase() == name)
            return profile;
    return undefined;
}
exports.find_profile_by_name = find_profile_by_name;
function default_profile() {
    return find_profile("default");
}
exports.default_profile = default_profile;
function set_default_profile(profile) {
    const old_default = default_profile();
    if (old_default && old_default != profile) {
        old_default.id = uid_1.guid();
    }
    profile.id = "default";
    return old_default;
}
exports.set_default_profile = set_default_profile;
function delete_profile(profile) {
    available_profiles.remove(profile);
}
exports.delete_profile = delete_profile;


/***/ }),

/***/ "./shared/js/profiles/Identity.ts":
/*!****************************************!*\
  !*** ./shared/js/profiles/Identity.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionBase_1 = __webpack_require__(/*! ../connection/ConnectionBase */ "./shared/js/connection/ConnectionBase.ts");
const NameIdentity_1 = __webpack_require__(/*! ./identities/NameIdentity */ "./shared/js/profiles/identities/NameIdentity.ts");
const TeaForumIdentity_1 = __webpack_require__(/*! ./identities/TeaForumIdentity */ "./shared/js/profiles/identities/TeaForumIdentity.ts");
const TeamSpeakIdentity_1 = __webpack_require__(/*! ./identities/TeamSpeakIdentity */ "./shared/js/profiles/identities/TeamSpeakIdentity.ts");
var IdentitifyType;
(function (IdentitifyType) {
    IdentitifyType[IdentitifyType["TEAFORO"] = 0] = "TEAFORO";
    IdentitifyType[IdentitifyType["TEAMSPEAK"] = 1] = "TEAMSPEAK";
    IdentitifyType[IdentitifyType["NICKNAME"] = 2] = "NICKNAME";
})(IdentitifyType = exports.IdentitifyType || (exports.IdentitifyType = {}));
function decode_identity(type, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let identity;
        switch (type) {
            case IdentitifyType.NICKNAME:
                identity = new NameIdentity_1.NameIdentity();
                break;
            case IdentitifyType.TEAFORO:
                identity = new TeaForumIdentity_1.TeaForumIdentity(undefined);
                break;
            case IdentitifyType.TEAMSPEAK:
                identity = new TeamSpeakIdentity_1.TeaSpeakIdentity(undefined, undefined);
                break;
        }
        if (!identity)
            return undefined;
        try {
            yield identity.decode(data);
        }
        catch (error) {
            console.error(error);
            return undefined;
        }
        return identity;
    });
}
exports.decode_identity = decode_identity;
function create_identity(type) {
    let identity;
    switch (type) {
        case IdentitifyType.NICKNAME:
            identity = new NameIdentity_1.NameIdentity();
            break;
        case IdentitifyType.TEAFORO:
            identity = new TeaForumIdentity_1.TeaForumIdentity(undefined);
            break;
        case IdentitifyType.TEAMSPEAK:
            identity = new TeamSpeakIdentity_1.TeaSpeakIdentity(undefined, undefined);
            break;
    }
    return identity;
}
exports.create_identity = create_identity;
class HandshakeCommandHandler extends ConnectionBase_1.AbstractCommandHandler {
    constructor(connection, handle) {
        super(connection);
        this.handle = handle;
    }
    handle_command(command) {
        if ($.isFunction(this[command.command]))
            this[command.command](command.arguments);
        else if (command.command == "error") {
            return false;
        }
        else {
            console.warn(tr("Received unknown command while handshaking (%o)"), command);
        }
        return true;
    }
}
exports.HandshakeCommandHandler = HandshakeCommandHandler;
class AbstractHandshakeIdentityHandler {
    constructor(connection) {
        this.callbacks = [];
        this.connection = connection;
    }
    register_callback(callback) {
        this.callbacks.push(callback);
    }
    trigger_success() {
        for (const callback of this.callbacks)
            callback(true);
    }
    trigger_fail(message) {
        for (const callback of this.callbacks)
            callback(false, message);
    }
}
exports.AbstractHandshakeIdentityHandler = AbstractHandshakeIdentityHandler;


/***/ }),

/***/ "./shared/js/profiles/identities/NameIdentity.ts":
/*!*******************************************************!*\
  !*** ./shared/js/profiles/identities/NameIdentity.ts ***!
  \*******************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ServerConnectionDeclaration_1 = __webpack_require__(/*! ../../connection/ServerConnectionDeclaration */ "./shared/js/connection/ServerConnectionDeclaration.ts");
const log_1 = __webpack_require__(/*! ../../log */ "./shared/js/log.ts");
const Identity_1 = __webpack_require__(/*! ../Identity */ "./shared/js/profiles/Identity.ts");
class NameHandshakeHandler extends Identity_1.AbstractHandshakeIdentityHandler {
    constructor(connection, identity) {
        super(connection);
        this.identity = identity;
        this.handler = new Identity_1.HandshakeCommandHandler(connection, this);
        this.handler["handshakeidentityproof"] = () => this.trigger_fail("server requested unexpected proof");
    }
    start_handshake() {
        this.connection.command_handler_boss().register_handler(this.handler);
        this.connection.send_command("handshakebegin", {
            intention: 0,
            authentication_method: this.identity.type(),
            client_nickname: this.identity.name()
        }).catch(error => {
            log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to initialize name based handshake. Error: %o"), error);
            if (error instanceof ServerConnectionDeclaration_1.CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute begin (" + error + ")");
        }).then(() => this.trigger_success());
    }
    trigger_fail(message) {
        this.connection.command_handler_boss().unregister_handler(this.handler);
        super.trigger_fail(message);
    }
    trigger_success() {
        this.connection.command_handler_boss().unregister_handler(this.handler);
        super.trigger_success();
    }
}
class NameIdentity {
    constructor(name) {
        this._name = name;
    }
    set_name(name) { this._name = name; }
    name() { return this._name; }
    fallback_name() {
        return this._name;
    }
    uid() {
        return btoa(this._name);
    }
    type() {
        return Identity_1.IdentitifyType.NICKNAME;
    }
    valid() {
        return this._name != undefined && this._name.length >= 5;
    }
    decode(data) {
        data = JSON.parse(data);
        if (data.version !== 1)
            throw "invalid version";
        this._name = data["name"];
        return;
    }
    encode() {
        return JSON.stringify({
            version: 1,
            name: this._name
        });
    }
    spawn_identity_handshake_handler(connection) {
        return new NameHandshakeHandler(connection, this);
    }
}
exports.NameIdentity = NameIdentity;


/***/ }),

/***/ "./shared/js/profiles/identities/TeaForumIdentity.ts":
/*!***********************************************************!*\
  !*** ./shared/js/profiles/identities/TeaForumIdentity.ts ***!
  \***********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __webpack_require__(/*! ../../log */ "./shared/js/log.ts");
const ServerConnectionDeclaration_1 = __webpack_require__(/*! ../../connection/ServerConnectionDeclaration */ "./shared/js/connection/ServerConnectionDeclaration.ts");
const teaspeak_forum_1 = __webpack_require__(/*! ./teaspeak-forum */ "./shared/js/profiles/identities/teaspeak-forum.ts");
const Identity_1 = __webpack_require__(/*! ../Identity */ "./shared/js/profiles/Identity.ts");
class TeaForumHandshakeHandler extends Identity_1.AbstractHandshakeIdentityHandler {
    constructor(connection, identity) {
        super(connection);
        this.identity = identity;
        this.handler = new Identity_1.HandshakeCommandHandler(connection, this);
        this.handler["handshakeidentityproof"] = this.handle_proof.bind(this);
    }
    start_handshake() {
        this.connection.command_handler_boss().register_handler(this.handler);
        this.connection.send_command("handshakebegin", {
            intention: 0,
            authentication_method: this.identity.type(),
            data: this.identity.data().data_json()
        }).catch(error => {
            log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to initialize TeaForum based handshake. Error: %o"), error);
            if (error instanceof ServerConnectionDeclaration_1.CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute begin (" + error + ")");
        });
    }
    handle_proof(json) {
        this.connection.send_command("handshakeindentityproof", {
            proof: this.identity.data().data_sign()
        }).catch(error => {
            log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to proof the identity. Error: %o"), error);
            if (error instanceof ServerConnectionDeclaration_1.CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute proof (" + error + ")");
        }).then(() => this.trigger_success());
    }
    trigger_fail(message) {
        this.connection.command_handler_boss().unregister_handler(this.handler);
        super.trigger_fail(message);
    }
    trigger_success() {
        this.connection.command_handler_boss().unregister_handler(this.handler);
        super.trigger_success();
    }
}
class TeaForumIdentity {
    constructor(data) {
        this.identity_data = data;
    }
    valid() {
        return !!this.identity_data && !this.identity_data.is_expired();
    }
    data() {
        return this.identity_data;
    }
    decode(data) {
        data = JSON.parse(data);
        if (data.version !== 1)
            throw "invalid version";
        return;
    }
    encode() {
        return JSON.stringify({
            version: 1
        });
    }
    spawn_identity_handshake_handler(connection) {
        return new TeaForumHandshakeHandler(connection, this);
    }
    fallback_name() {
        return this.identity_data ? this.identity_data.name() : undefined;
    }
    type() {
        return Identity_1.IdentitifyType.TEAFORO;
    }
    uid() {
        return "TeaForo#" + ((this.identity_data ? this.identity_data.name() : "Another TeaSpeak user"));
    }
}
exports.TeaForumIdentity = TeaForumIdentity;
let static_identity;
function set_static_identity(identity) {
    static_identity = identity;
}
exports.set_static_identity = set_static_identity;
function update_forum() {
    if (teaspeak_forum_1.forum.logged_in() && (!static_identity || static_identity.data() !== teaspeak_forum_1.forum.data())) {
        static_identity = new TeaForumIdentity(teaspeak_forum_1.forum.data());
    }
    else {
        static_identity = undefined;
    }
}
exports.update_forum = update_forum;
function valid_static_forum_identity() {
    return static_identity && static_identity.valid();
}
exports.valid_static_forum_identity = valid_static_forum_identity;
function static_forum_identity() {
    return static_identity;
}
exports.static_forum_identity = static_forum_identity;


/***/ }),

/***/ "./shared/js/profiles/identities/TeamSpeakIdentity.ts":
/*!************************************************************!*\
  !*** ./shared/js/profiles/identities/TeamSpeakIdentity.ts ***!
  \************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = __webpack_require__(/*! ../../main */ "./shared/js/main.ts");
const sha_1 = __webpack_require__(/*! ../../crypto/sha */ "./shared/js/crypto/sha.ts");
const asn1_1 = __webpack_require__(/*! ../../crypto/asn1 */ "./shared/js/crypto/asn1.ts");
const log_1 = __webpack_require__(/*! ../../log */ "./shared/js/log.ts");
const ServerConnectionDeclaration_1 = __webpack_require__(/*! ../../connection/ServerConnectionDeclaration */ "./shared/js/connection/ServerConnectionDeclaration.ts");
const settings_1 = __webpack_require__(/*! ../../settings */ "./shared/js/settings.ts");
const Identity_1 = __webpack_require__(/*! ../Identity */ "./shared/js/profiles/Identity.ts");
var CryptoHelper;
(function (CryptoHelper) {
    function base64_url_encode(str) {
        return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
    }
    CryptoHelper.base64_url_encode = base64_url_encode;
    function base64_url_decode(str, pad) {
        if (typeof (pad) === 'undefined' || pad)
            str = (str + '===').slice(0, str.length + (str.length % 4));
        return str.replace(/-/g, '+').replace(/_/g, '/');
    }
    CryptoHelper.base64_url_decode = base64_url_decode;
    function arraybuffer_to_string(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }
    CryptoHelper.arraybuffer_to_string = arraybuffer_to_string;
    function export_ecc_key(crypto_key, public_key) {
        return __awaiter(this, void 0, void 0, function* () {
            const key_data = yield crypto.subtle.exportKey("jwk", crypto_key);
            let index = 0;
            const length = public_key ? 79 : 114;
            const buffer = new Uint8Array(length);
            {
                buffer[index++] = 0x30;
                buffer[index++] = 0x00;
            }
            {
                buffer[index++] = 0x03;
                buffer[index++] = 0x02;
                buffer[index++] = 0x07;
                buffer[index++] = public_key ? 0x00 : 0x80;
            }
            {
                buffer[index++] = 0x02;
                buffer[index++] = 0x01;
                buffer[index++] = 0x20;
            }
            try {
                buffer[index++] = 0x02;
                buffer[index++] = 0x20;
                const raw = atob(base64_url_decode(key_data.x, false));
                if (raw.charCodeAt(0) > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }
                for (let i = 0; i < 32; i++)
                    buffer[index++] = raw.charCodeAt(i);
            }
            catch (error) {
                if (error instanceof DOMException)
                    throw "failed to parse x coordinate (invalid base64)";
                throw error;
            }
            try {
                buffer[index++] = 0x02;
                buffer[index++] = 0x20;
                const raw = atob(base64_url_decode(key_data.y, false));
                if (raw.charCodeAt(0) > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }
                for (let i = 0; i < 32; i++)
                    buffer[index++] = raw.charCodeAt(i);
            }
            catch (error) {
                if (error instanceof DOMException)
                    throw "failed to parse y coordinate (invalid base64)";
                throw error;
            }
            if (!public_key) {
                try {
                    buffer[index++] = 0x02;
                    buffer[index++] = 0x20;
                    const raw = atob(base64_url_decode(key_data.d, false));
                    if (raw.charCodeAt(0) > 0x7F) {
                        buffer[index - 1] += 1;
                        buffer[index++] = 0;
                    }
                    for (let i = 0; i < 32; i++)
                        buffer[index++] = raw.charCodeAt(i);
                }
                catch (error) {
                    if (error instanceof DOMException)
                        throw "failed to parse y coordinate (invalid base64)";
                    throw error;
                }
            }
            buffer[1] = index - 2;
            return main_1.base64_encode_ab(buffer.buffer.slice(0, index));
        });
    }
    CryptoHelper.export_ecc_key = export_ecc_key;
    const crypt_key = "b9dfaa7bee6ac57ac7b65f1094a1c155e747327bc2fe5d51c512023fe54a280201004e90ad1daaae1075d53b7d571c30e063b5a62a4a017bb394833aa0983e6e";
    function c_strlen(buffer, offset) {
        let index = 0;
        while (index + offset < buffer.length && buffer[index + offset] != 0)
            index++;
        return index;
    }
    function decrypt_ts_identity(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            const hash = new Uint8Array(yield sha_1.sha.sha1(buffer.buffer.slice(20, 20 + c_strlen(buffer, 20))));
            for (let i = 0; i < 20; i++)
                buffer[i] ^= hash[i];
            const length = Math.min(buffer.length, 100);
            for (let i = 0; i < length; i++)
                buffer[i] ^= crypt_key.charCodeAt(i);
            return arraybuffer_to_string(buffer);
        });
    }
    CryptoHelper.decrypt_ts_identity = decrypt_ts_identity;
    function encrypt_ts_identity(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            const length = Math.min(buffer.length, 100);
            for (let i = 0; i < length; i++)
                buffer[i] ^= crypt_key.charCodeAt(i);
            const hash = new Uint8Array(yield sha_1.sha.sha1(buffer.buffer.slice(20, 20 + c_strlen(buffer, 20))));
            for (let i = 0; i < 20; i++)
                buffer[i] ^= hash[i];
            return main_1.base64_encode_ab(buffer);
        });
    }
    CryptoHelper.encrypt_ts_identity = encrypt_ts_identity;
    function decode_tomcrypt_key(buffer) {
        let decoded;
        try {
            decoded = asn1_1.asn1.decode(atob(buffer));
        }
        catch (error) {
            if (error instanceof DOMException)
                throw "failed to parse key buffer (invalid base64)";
            throw error;
        }
        let { x, y, k } = {
            x: decoded.children[2].content(Infinity, asn1_1.asn1.TagType.VisibleString),
            y: decoded.children[3].content(Infinity, asn1_1.asn1.TagType.VisibleString),
            k: decoded.children[4].content(Infinity, asn1_1.asn1.TagType.VisibleString)
        };
        if (x.length > 32) {
            if (x.charCodeAt(0) != 0)
                throw "Invalid X coordinate! (Too long)";
            x = x.substr(1);
        }
        if (y.length > 32) {
            if (y.charCodeAt(0) != 0)
                throw "Invalid Y coordinate! (Too long)";
            y = y.substr(1);
        }
        if (k.length > 32) {
            if (k.charCodeAt(0) != 0)
                throw "Invalid private coordinate! (Too long)";
            k = k.substr(1);
        }
        return {
            crv: "P-256",
            d: base64_url_encode(btoa(k)),
            x: base64_url_encode(btoa(x)),
            y: base64_url_encode(btoa(y)),
            ext: true,
            key_ops: ["deriveKey", "sign"],
            kty: "EC",
        };
    }
    CryptoHelper.decode_tomcrypt_key = decode_tomcrypt_key;
})(CryptoHelper = exports.CryptoHelper || (exports.CryptoHelper = {}));
class TeaSpeakHandshakeHandler extends Identity_1.AbstractHandshakeIdentityHandler {
    constructor(connection, identity) {
        super(connection);
        this.identity = identity;
        this.handler = new Identity_1.HandshakeCommandHandler(connection, this);
        this.handler["handshakeidentityproof"] = this.handle_proof.bind(this);
    }
    start_handshake() {
        this.connection.command_handler_boss().register_handler(this.handler);
        this.connection.send_command("handshakebegin", {
            intention: 0,
            authentication_method: this.identity.type(),
            publicKey: this.identity.public_key
        }).catch(error => {
            log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to initialize TeamSpeak based handshake. Error: %o"), error);
            if (error instanceof ServerConnectionDeclaration_1.CommandResult)
                error = error.extra_message || error.message;
            this.trigger_fail("failed to execute begin (" + error + ")");
        });
    }
    handle_proof(json) {
        if (!json[0]["digest"]) {
            this.trigger_fail("server too old");
            return;
        }
        this.identity.sign_message(json[0]["message"], json[0]["digest"]).then(proof => {
            this.connection.send_command("handshakeindentityproof", { proof: proof }).catch(error => {
                log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to proof the identity. Error: %o"), error);
                if (error instanceof ServerConnectionDeclaration_1.CommandResult)
                    error = error.extra_message || error.message;
                this.trigger_fail("failed to execute proof (" + error + ")");
            }).then(() => this.trigger_success());
        }).catch(error => {
            this.trigger_fail("failed to sign message");
        });
    }
    trigger_fail(message) {
        this.connection.command_handler_boss().unregister_handler(this.handler);
        super.trigger_fail(message);
    }
    trigger_success() {
        this.connection.command_handler_boss().unregister_handler(this.handler);
        super.trigger_success();
    }
}
class IdentityPOWWorker {
    initialize(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this._worker = new Worker(settings_1.settings.static("worker_directory", "js/workers/") + "WorkerPOW.js");
            yield new Promise((resolve, reject) => {
                const timeout_id = setTimeout(() => reject("timeout"), 1000);
                this._worker.onmessage = event => {
                    clearTimeout(timeout_id);
                    if (!event.data) {
                        reject("invalid data");
                        return;
                    }
                    if (!event.data.success) {
                        reject("initialize failed (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                        return;
                    }
                    this._worker.onmessage = event => this.handle_message(event.data);
                    resolve();
                };
                this._worker.onerror = event => {
                    log_1.log.error(log_1.LogCategory.IDENTITIES, tr("POW Worker error %o"), event);
                    clearTimeout(timeout_id);
                    reject("Failed to load worker (" + event.message + ")");
                };
            });
            yield new Promise((resolve, reject) => {
                this._worker.postMessage({
                    type: "set_data",
                    private_key: key,
                    code: "set_data"
                });
                const timeout_id = setTimeout(() => reject("timeout (data)"), 1000);
                this._worker.onmessage = event => {
                    clearTimeout(timeout_id);
                    if (!event.data) {
                        reject("invalid data");
                        return;
                    }
                    if (!event.data.success) {
                        reject("initialize of data failed (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                        return;
                    }
                    this._worker.onmessage = event => this.handle_message(event.data);
                    resolve();
                };
            });
        });
    }
    mine(hash, iterations, target, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            this._current_hash = hash;
            if (target < this._best_level)
                return true;
            return yield new Promise((resolve, reject) => {
                this._worker.postMessage({
                    type: "mine",
                    hash: this._current_hash,
                    iterations: iterations,
                    target: target,
                    code: "mine"
                });
                const timeout_id = setTimeout(() => reject("timeout (mine)"), timeout || 5000);
                this._worker.onmessage = event => {
                    this._worker.onmessage = event => this.handle_message(event.data);
                    clearTimeout(timeout_id);
                    if (!event.data) {
                        reject("invalid data");
                        return;
                    }
                    if (!event.data.success) {
                        reject("mining failed (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                        return;
                    }
                    if (event.data.result) {
                        this._best_level = event.data.level;
                        this._current_hash = event.data.hash;
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                };
            });
        });
    }
    current_hash() {
        return this._current_hash;
    }
    current_level() {
        return this._best_level;
    }
    finalize(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield new Promise((resolve, reject) => {
                    this._worker.postMessage({
                        type: "finalize",
                        code: "finalize"
                    });
                    const timeout_id = setTimeout(() => reject("timeout"), timeout || 250);
                    this._worker.onmessage = event => {
                        this._worker.onmessage = event => this.handle_message(event.data);
                        clearTimeout(timeout_id);
                        if (!event.data) {
                            reject("invalid data");
                            return;
                        }
                        if (!event.data.success) {
                            reject("failed to finalize (" + event.data.success + " | " + (event.data.message || "unknown eroror") + ")");
                            return;
                        }
                        resolve();
                    };
                });
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to finalize POW worker! (%o)"), error);
            }
            this._worker.terminate();
            this._worker = undefined;
        });
    }
    handle_message(message) {
        log_1.log.info(log_1.LogCategory.IDENTITIES, tr("Received message: %o"), message);
    }
}
class TeaSpeakIdentity {
    constructor(private_key, hash, name, initialize) {
        this.private_key = private_key;
        this.hash_number = hash || "0";
        this._name = name;
        if (this.private_key && (typeof (initialize) === "undefined" || initialize)) {
            this.initialize().catch(error => {
                log_1.log.error(log_1.LogCategory.IDENTITIES, "Failed to initialize TeaSpeakIdentity (%s)", error);
                this._initialized = false;
            });
        }
    }
    static generate_new() {
        return __awaiter(this, void 0, void 0, function* () {
            let key;
            try {
                key = yield crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ["deriveKey"]);
            }
            catch (e) {
                log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Could not generate a new key: %o"), e);
                throw "Failed to generate keypair";
            }
            const private_key = yield CryptoHelper.export_ecc_key(key.privateKey, false);
            const identity = new TeaSpeakIdentity(private_key, "0", undefined, false);
            yield identity.initialize();
            return identity;
        });
    }
    static import_ts(ts_string, ini) {
        return __awaiter(this, void 0, void 0, function* () {
            const parse_string = string => {
                const V_index = string.indexOf('V');
                if (V_index == -1)
                    throw "invalid input (missing V)";
                return {
                    hash: string.substr(0, V_index),
                    data: string.substr(V_index + 1),
                    name: "TeaSpeak user"
                };
            };
            const { hash, data, name } = (!ini ? () => parse_string(ts_string) : () => {
                let identity, name;
                for (const line of ts_string.split("\n")) {
                    if (line.startsWith("identity="))
                        identity = line.substr(9);
                    else if (line.startsWith("nickname="))
                        name = line.substr(9);
                }
                if (!identity)
                    throw "missing identity keyword";
                identity = identity.match(/^"?([0-9]+V[0-9a-zA-Z+\/]+[=]+)"?$/)[1];
                if (!identity)
                    throw "invalid identity key value";
                const result = parse_string(identity);
                result.name = name || result.name;
                return result;
            })();
            if (!ts_string.match(/[0-9]+/g))
                throw "invalid hash!";
            let buffer;
            try {
                buffer = new Uint8Array(main_1.arrayBufferBase64(data));
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.IDENTITIES, tr("Failed to decode given base64 data (%s)"), data);
                throw "failed to base data (base64 decode failed)";
            }
            const key64 = yield CryptoHelper.decrypt_ts_identity(new Uint8Array(main_1.arrayBufferBase64(data)));
            const identity = new TeaSpeakIdentity(key64, hash, name, false);
            yield identity.initialize();
            return identity;
        });
    }
    fallback_name() {
        return this._name;
    }
    uid() {
        return this._unique_id;
    }
    type() {
        return Identity_1.IdentitifyType.TEAMSPEAK;
    }
    valid() {
        return this._initialized && !!this._crypto_key && !!this._crypto_key_sign;
    }
    decode(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const json = JSON.parse(data);
            if (!json)
                throw "invalid json";
            if (json.version == 2) {
                this.private_key = json.key;
                this.hash_number = json.hash;
                this._name = json.name;
            }
            else if (json.version == 1) {
                const key = json.key;
                this._name = json.name;
                const clone = yield TeaSpeakIdentity.import_ts(key, false);
                this.private_key = clone.private_key;
                this.hash_number = clone.hash_number;
            }
            else
                throw "invalid version";
            yield this.initialize();
        });
    }
    encode() {
        return JSON.stringify({
            key: this.private_key,
            hash: this.hash_number,
            name: this._name,
            version: 2
        });
    }
    level() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._initialized || !this.public_key)
                throw "not initialized";
            const hash = new Uint8Array(yield sha_1.sha.sha1(this.public_key + this.hash_number));
            let level = 0;
            while (level < hash.byteLength && hash[level] == 0)
                level++;
            if (level >= hash.byteLength) {
                level = 256;
            }
            else {
                let byte = hash[level];
                level <<= 3;
                while ((byte & 0x1) == 0) {
                    level++;
                    byte >>= 1;
                }
            }
            return level;
        });
    }
    string_add(a, b) {
        const char_result = [];
        const char_a = [...a].reverse().map(e => e.charCodeAt(0));
        const char_b = [...b].reverse().map(e => e.charCodeAt(0));
        let carry = false;
        while (char_b.length > 0) {
            let result = char_b.pop_front() + char_a.pop_front() + (carry ? 1 : 0) - 48;
            if ((carry = result > 57))
                result -= 10;
            char_result.push(result);
        }
        while (char_a.length > 0) {
            let result = char_a.pop_front() + (carry ? 1 : 0);
            if ((carry = result > 57))
                result -= 10;
            char_result.push(result);
        }
        if (carry)
            char_result.push(49);
        return String.fromCharCode.apply(null, char_result.slice().reverse());
    }
    improve_level_for(time, threads) {
        return __awaiter(this, void 0, void 0, function* () {
            let active = true;
            setTimeout(() => active = false, time);
            return yield this.improve_level(-1, threads, () => active);
        });
    }
    improve_level(target, threads, active_callback, callback_level, callback_status) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._initialized || !this.public_key)
                throw "not initialized";
            if (target == -1)
                target = 0;
            else if (target <= (yield this.level()))
                return true;
            const workers = [];
            const iterations = 100000;
            let current_hash;
            const next_hash = () => {
                if (!current_hash)
                    return (current_hash = this.hash_number);
                if (current_hash.length < iterations.toString().length) {
                    current_hash = this.string_add(iterations.toString(), current_hash);
                }
                else {
                    current_hash = this.string_add(current_hash, iterations.toString());
                }
                return current_hash;
            };
            {
                const initialize_promise = [];
                for (let index = 0; index < threads; index++) {
                    const worker = new IdentityPOWWorker();
                    workers.push(worker);
                    initialize_promise.push(worker.initialize(this.public_key));
                }
                try {
                    yield Promise.all(initialize_promise);
                }
                catch (error) {
                    log_1.log.error(log_1.LogCategory.IDENTITIES, error);
                    throw "failed to initialize";
                }
            }
            let result = false;
            let best_level = 0;
            let target_level = target > 0 ? target : (yield this.level()) + 1;
            const worker_promise = [];
            const hash_timestamps = [];
            let last_hashrate_update = 0;
            const update_hashrate = () => {
                if (!callback_status)
                    return;
                const now = Date.now();
                hash_timestamps.push(now);
                if (last_hashrate_update + 1000 < now) {
                    last_hashrate_update = now;
                    const timeout = now - 10 * 1000;
                    const rounds = hash_timestamps.filter(e => e > timeout);
                    callback_status(Math.ceil((rounds.length * iterations) / Math.ceil((now - rounds[0]) / 1000)));
                }
            };
            try {
                result = yield new Promise((resolve, reject) => {
                    let active = true;
                    const exit = () => {
                        const timeout = setTimeout(() => resolve(true), 1000);
                        Promise.all(worker_promise).then(result => {
                            clearTimeout(timeout);
                            resolve(true);
                        }).catch(error => resolve(true));
                        active = false;
                    };
                    for (const worker of workers) {
                        const worker_mine = () => {
                            if (!active)
                                return;
                            const promise = worker.mine(next_hash(), iterations, target_level);
                            const p = promise.then(result => {
                                update_hashrate();
                                worker_promise.remove(p);
                                if (result.valueOf()) {
                                    if (worker.current_level() > best_level) {
                                        this.hash_number = worker.current_hash();
                                        log_1.log.info(log_1.LogCategory.IDENTITIES, "Found new best at %s (%d). Old was %d", this.hash_number, worker.current_level(), best_level);
                                        best_level = worker.current_level();
                                        if (callback_level)
                                            callback_level(best_level);
                                    }
                                    if (active) {
                                        if (target > 0)
                                            exit();
                                        else
                                            target_level = best_level + 1;
                                    }
                                }
                                if (active && (active = active_callback()))
                                    setTimeout(() => worker_mine(), 0);
                                else {
                                    exit();
                                }
                                return Promise.resolve();
                            }).catch(error => {
                                worker_promise.remove(p);
                                log_1.log.warn(log_1.LogCategory.IDENTITIES, "POW worker error %o", error);
                                reject(error);
                                return Promise.resolve();
                            });
                            worker_promise.push(p);
                        };
                        worker_mine();
                    }
                });
            }
            catch (error) {
            }
            {
                const finalize_promise = [];
                for (const worker of workers)
                    finalize_promise.push(worker.finalize(250));
                try {
                    yield Promise.all(finalize_promise);
                }
                catch (error) {
                    log_1.log.error(log_1.LogCategory.IDENTITIES, error);
                    throw "failed to finalize";
                }
            }
            return result;
        });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.private_key)
                throw "Invalid private key";
            let jwk;
            try {
                jwk = yield CryptoHelper.decode_tomcrypt_key(this.private_key);
                if (!jwk)
                    throw "result undefined";
            }
            catch (error) {
                throw "failed to parse key (" + error + ")";
            }
            try {
                this._crypto_key_sign = yield crypto.subtle.importKey("jwk", jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ["sign"]);
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.IDENTITIES, error);
                throw "failed to create crypto sign key";
            }
            try {
                this._crypto_key = yield crypto.subtle.importKey("jwk", jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ["deriveKey"]);
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.IDENTITIES, error);
                throw "failed to create crypto key";
            }
            try {
                this.public_key = yield CryptoHelper.export_ecc_key(this._crypto_key, true);
                this._unique_id = main_1.base64_encode_ab(yield sha_1.sha.sha1(this.public_key));
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.IDENTITIES, error);
                throw "failed to calculate unique id";
            }
            this._initialized = true;
        });
    }
    export_ts(ini) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.private_key)
                throw "Invalid private key";
            const identity = this.hash_number + "V" + (yield CryptoHelper.encrypt_ts_identity(new Uint8Array(main_1.str2ab8(this.private_key))));
            if (!ini)
                return identity;
            return "[Identity]\n" +
                "id=TeaWeb-Exported\n" +
                "identity=\"" + identity + "\"\n" +
                "nickname=\"" + this.fallback_name() + "\"\n" +
                "phonetic_nickname=";
        });
    }
    sign_message(message, hash = "SHA-256") {
        return __awaiter(this, void 0, void 0, function* () {
            const sign_buffer = yield crypto.subtle.sign({
                name: "ECDSA",
                hash: hash
            }, this._crypto_key_sign, main_1.str2ab8(message));
            const sign = new Uint8Array(sign_buffer);
            const buffer = new Uint8Array(72);
            let index = 0;
            {
                buffer[index++] = 0x30;
                buffer[index++] = 0x00;
            }
            {
                buffer[index++] = 0x02;
                buffer[index++] = 0x20;
                if (sign[0] > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }
                for (let i = 0; i < 32; i++)
                    buffer[index++] = sign[i];
            }
            {
                buffer[index++] = 0x02;
                buffer[index++] = 0x20;
                if (sign[32] > 0x7F) {
                    buffer[index - 1] += 1;
                    buffer[index++] = 0;
                }
                for (let i = 0; i < 32; i++)
                    buffer[index++] = sign[32 + i];
            }
            buffer[1] = index - 2;
            return main_1.base64_encode_ab(buffer.subarray(0, index));
        });
    }
    spawn_identity_handshake_handler(connection) {
        return new TeaSpeakHandshakeHandler(connection, this);
    }
}
exports.TeaSpeakIdentity = TeaSpeakIdentity;


/***/ }),

/***/ "./shared/js/profiles/identities/teaspeak-forum.ts":
/*!*********************************************************!*\
  !*** ./shared/js/profiles/identities/teaspeak-forum.ts ***!
  \*********************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = __webpack_require__(/*! ../../settings */ "./shared/js/settings.ts");
const TeaForumIdentity_1 = __webpack_require__(/*! ./TeaForumIdentity */ "./shared/js/profiles/identities/TeaForumIdentity.ts");
var forum;
(function (forum) {
    let gcaptcha;
    (function (gcaptcha) {
        function initialize() {
            return __awaiter(this, void 0, void 0, function* () {
                if (typeof (window.grecaptcha) === "undefined") {
                    let script = document.createElement("script");
                    script.async = true;
                    let timeout;
                    const callback_name = "captcha_callback_" + Math.random().toString().replace(".", "");
                    try {
                        yield new Promise((resolve, reject) => {
                            script.onerror = reject;
                            window[callback_name] = resolve;
                            script.src = "https://www.google.com/recaptcha/api.js?onload=" + encodeURIComponent(callback_name) + "&render=explicit";
                            document.body.append(script);
                            timeout = setTimeout(() => reject("timeout"), 15000);
                        });
                    }
                    catch (error) {
                        script.remove();
                        script = undefined;
                        console.error(tr("Failed to fetch recaptcha javascript source: %o"), error);
                        throw tr("failed to download source");
                    }
                    finally {
                        if (script)
                            script.onerror = undefined;
                        delete window[callback_name];
                        clearTimeout(timeout);
                    }
                }
                if (typeof (window.grecaptcha) === "undefined")
                    throw tr("failed to load recaptcha");
            });
        }
        gcaptcha.initialize = initialize;
        function spawn(container, key, callback_data) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    yield initialize();
                }
                catch (error) {
                    console.error(tr("Failed to initialize G-Recaptcha. Error: %o"), error);
                    throw tr("initialisation failed");
                }
                if (container.attr("captcha-uuid"))
                    window.grecaptcha.reset(container.attr("captcha-uuid"));
                else {
                    container.attr("captcha-uuid", window.grecaptcha.render(container[0], {
                        "sitekey": key,
                        callback: callback_data
                    }));
                }
            });
        }
        gcaptcha.spawn = spawn;
    })(gcaptcha = forum.gcaptcha || (forum.gcaptcha = {}));
    function api_url() {
        return settings_1.settings.static_global(settings_1.Settings.KEY_TEAFORO_URL);
    }
    class Data {
        constructor(auth, raw, sign) {
            this.auth_key = auth;
            this.raw = raw;
            this.sign = sign;
            this.parsed = JSON.parse(raw);
        }
        data_json() { return this.raw; }
        data_sign() { return this.sign; }
        name() { return this.parsed.user_name; }
        user_id() { return this.parsed.user_id; }
        user_group() { return this.parsed.user_group_id; }
        is_stuff() { return this.parsed.is_staff; }
        is_premium() { return this.parsed.user_groups.indexOf(5) != -1; }
        data_age() { return new Date(this.parsed.data_age); }
        is_expired() { return this.parsed.data_age + 48 * 60 * 60 * 1000 < Date.now(); }
        should_renew() { return this.parsed.data_age + 24 * 60 * 60 * 1000 < Date.now(); }
    }
    forum.Data = Data;
    let _data;
    function logged_in() {
        return !!_data && !_data.is_expired();
    }
    forum.logged_in = logged_in;
    function data() { return _data; }
    forum.data = data;
    function login(username, password, captcha) {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                response = yield new Promise((resolve, reject) => {
                    $.ajax({
                        url: api_url() + "?web-api/v1/login",
                        type: "POST",
                        cache: false,
                        data: {
                            username: username,
                            password: password,
                            remember: true,
                            "g-recaptcha-response": captcha
                        },
                        crossDomain: true,
                        success: resolve,
                        error: (xhr, status, error) => {
                            console.log(tr("Login request failed %o: %o"), status, error);
                            reject(tr("request failed"));
                        }
                    });
                });
            }
            catch (error) {
                return {
                    status: "error",
                    error_message: tr("failed to send login request")
                };
            }
            if (response["status"] !== "ok") {
                console.error(tr("Response status not okey. Error happend: %o"), response);
                return {
                    status: "error",
                    error_message: (response["errors"] || [])[0] || tr("Unknown error")
                };
            }
            if (!response["success"]) {
                console.error(tr("Login failed. Response %o"), response);
                let message = tr("failed to login");
                let captcha;
                if (response["code"] == 1 || response["code"] == 3)
                    message = tr("Invalid username or password");
                if (response["code"] == 2 || response["code"] == 3) {
                    captcha = {
                        type: response["captcha"]["type"],
                        data: response["captcha"]["siteKey"]
                    };
                    if (response["code"] == 2)
                        message = tr("captcha required");
                }
                return {
                    status: typeof (captcha) !== "undefined" ? "captcha" : "error",
                    error_message: message,
                    captcha: captcha
                };
            }
            try {
                _data = new Data(response["auth-key"], response["data"], response["sign"]);
                localStorage.setItem("teaspeak-forum-data", response["data"]);
                localStorage.setItem("teaspeak-forum-sign", response["sign"]);
                localStorage.setItem("teaspeak-forum-auth", response["auth-key"]);
                TeaForumIdentity_1.update_forum();
            }
            catch (error) {
                console.error(tr("Failed to parse forum given data: %o"), error);
                return {
                    status: "error",
                    error_message: tr("Failed to parse response data")
                };
            }
            return {
                status: "success"
            };
        });
    }
    forum.login = login;
    function renew_data() {
        return __awaiter(this, void 0, void 0, function* () {
            let response;
            try {
                response = yield new Promise((resolve, reject) => {
                    $.ajax({
                        url: api_url() + "?web-api/v1/renew-data",
                        type: "GET",
                        cache: false,
                        crossDomain: true,
                        data: {
                            "auth-key": _data.auth_key
                        },
                        success: resolve,
                        error: (xhr, status, error) => {
                            console.log(tr("Renew request failed %o: %o"), status, error);
                            reject(tr("request failed"));
                        }
                    });
                });
            }
            catch (error) {
                throw tr("failed to send renew request");
            }
            if (response["status"] !== "ok") {
                console.error(tr("Response status not okey. Error happend: %o"), response);
                throw (response["errors"] || [])[0] || tr("Unknown error");
            }
            if (!response["success"]) {
                if (response["code"] == 1) {
                    return "login-required";
                }
                throw "invalid error code (" + response["code"] + ")";
            }
            if (!response["data"] || !response["sign"])
                throw tr("response missing data");
            console.debug(tr("Renew succeeded. Parsing data."));
            try {
                _data = new Data(_data.auth_key, response["data"], response["sign"]);
                localStorage.setItem("teaspeak-forum-data", response["data"]);
                localStorage.setItem("teaspeak-forum-sign", response["sign"]);
                TeaForumIdentity_1.update_forum();
            }
            catch (error) {
                console.error(tr("Failed to parse forum given data: %o"), error);
                throw tr("failed to parse data");
            }
            return "success";
        });
    }
    forum.renew_data = renew_data;
    function logout() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!logged_in())
                return;
            let response;
            try {
                response = yield new Promise((resolve, reject) => {
                    $.ajax({
                        url: api_url() + "?web-api/v1/logout",
                        type: "GET",
                        cache: false,
                        crossDomain: true,
                        data: {
                            "auth-key": _data.auth_key
                        },
                        success: resolve,
                        error: (xhr, status, error) => {
                            console.log(tr("Logout request failed %o: %o"), status, error);
                            reject(tr("request failed"));
                        }
                    });
                });
            }
            catch (error) {
                throw tr("failed to send logout request");
            }
            if (response["status"] !== "ok") {
                console.error(tr("Response status not okey. Error happend: %o"), response);
                throw (response["errors"] || [])[0] || tr("Unknown error");
            }
            if (!response["success"]) {
                if (response["code"] != 1) {
                    throw "invalid error code (" + response["code"] + ")";
                }
            }
            _data = undefined;
            localStorage.removeItem("teaspeak-forum-data");
            localStorage.removeItem("teaspeak-forum-sign");
            localStorage.removeItem("teaspeak-forum-auth");
            TeaForumIdentity_1.update_forum();
        });
    }
    forum.logout = logout;
    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "TeaForo initialize",
        priority: 10,
        function: () => __awaiter(this, void 0, void 0, function* () {
            const raw_data = localStorage.getItem("teaspeak-forum-data");
            const raw_sign = localStorage.getItem("teaspeak-forum-sign");
            const forum_auth = localStorage.getItem("teaspeak-forum-auth");
            if (!raw_data || !raw_sign || !forum_auth) {
                console.log(tr("No TeaForo authentification found. TeaForo connection status: unconnected"));
                return;
            }
            try {
                _data = new Data(forum_auth, raw_data, raw_sign);
            }
            catch (error) {
                console.error(tr("Failed to initialize TeaForo connection from local data. Error: %o"), error);
                return;
            }
            if (_data.should_renew()) {
                console.info(tr("TeaForo data should be renewed. Executing renew."));
                renew_data().then(status => {
                    if (status === "success") {
                        console.info(tr("TeaForo data has been successfully renewed."));
                    }
                    else {
                        console.warn(tr("Failed to renew TeaForo data. New login required."));
                        localStorage.removeItem("teaspeak-forum-data");
                        localStorage.removeItem("teaspeak-forum-sign");
                        localStorage.removeItem("teaspeak-forum-auth");
                    }
                }).catch(error => {
                    console.warn(tr("Failed to renew TeaForo data. An error occurred: %o"), error);
                });
                return;
            }
            if (_data && _data.is_expired()) {
                console.error(tr("TeaForo data is expired. TeaForo connection isn't available!"));
            }
        })
    });
})(forum = exports.forum || (exports.forum = {}));


/***/ }),

/***/ "./shared/js/settings.ts":
/*!*******************************!*\
  !*** ./shared/js/settings.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __webpack_require__(/*! ./log */ "./shared/js/log.ts");
const modal_1 = __webpack_require__(/*! ./ui/elements/modal */ "./shared/js/ui/elements/modal.ts");
if (typeof (customElements) !== "undefined") {
    try {
        class X_Properties extends HTMLElement {
        }
        class X_Property extends HTMLElement {
        }
        customElements.define('x-properties', X_Properties, { extends: 'div' });
        customElements.define('x-property', X_Property, { extends: 'div' });
    }
    catch (error) {
        console.warn("failed to define costum elements");
    }
}
class SettingsBase {
    static transformStO(input, _default, default_type) {
        default_type = default_type || typeof _default;
        if (typeof input === "undefined")
            return _default;
        if (default_type === "string")
            return input;
        else if (default_type === "number")
            return parseInt(input);
        else if (default_type === "boolean")
            return (input == "1" || input == "true");
        else if (default_type === "undefined")
            return input;
        return JSON.parse(input);
    }
    static transformOtS(input) {
        if (typeof input === "string")
            return input;
        else if (typeof input === "number")
            return input.toString();
        else if (typeof input === "boolean")
            return input ? "1" : "0";
        else if (typeof input === "undefined")
            return undefined;
        return JSON.stringify(input);
    }
    static resolveKey(key, _default, resolver, default_type) {
        let value = resolver(key.key);
        if (!value) {
            for (const fallback of key.fallback_keys || []) {
                value = resolver(fallback);
                if (typeof (value) === "string") {
                    const importer = (key.fallback_imports || {})[fallback];
                    if (importer)
                        return importer(value);
                    break;
                }
            }
        }
        if (typeof (value) !== 'string')
            return _default;
        return SettingsBase.transformStO(value, _default, default_type);
    }
    static keyify(key) {
        if (typeof (key) === "string")
            return { key: key };
        if (typeof (key) === "object" && key.key)
            return key;
        throw "key is not a key";
    }
}
exports.SettingsBase = SettingsBase;
SettingsBase.UPDATE_DIRECT = true;
class StaticSettings extends SettingsBase {
    constructor(_reserved = undefined) {
        super();
        if (_reserved && !StaticSettings._instance) {
            this._staticPropsTag = $("#properties");
            this.initializeStatic();
        }
        else {
            this._handle = StaticSettings.instance;
        }
    }
    static get instance() {
        if (!this._instance)
            this._instance = new StaticSettings(true);
        return this._instance;
    }
    initializeStatic() {
        let search;
        if (window.opener && window.opener !== window) {
            search = new URL(window.location.href).search;
        }
        else {
            search = location.search;
        }
        search.substr(1).split("&").forEach(part => {
            let item = part.split("=");
            $("<x-property></x-property>")
                .attr("key", item[0])
                .attr("value", item[1])
                .appendTo(this._staticPropsTag);
        });
    }
    static(key, _default, default_type) {
        if (this._handle)
            return this._handle.static(key, _default, default_type);
        key = StaticSettings.keyify(key);
        return StaticSettings.resolveKey(key, _default, key => {
            let result = this._staticPropsTag.find("[key='" + key + "']");
            if (result.length > 0)
                return decodeURIComponent(result.last().attr('value'));
            return false;
        }, default_type);
    }
    deleteStatic(key) {
        if (this._handle) {
            this._handle.deleteStatic(key);
            return;
        }
        key = StaticSettings.keyify(key);
        let result = this._staticPropsTag.find("[key='" + key.key + "']");
        if (result.length != 0)
            result.detach();
    }
}
exports.StaticSettings = StaticSettings;
class Settings extends StaticSettings {
    constructor() {
        super();
        this.cacheGlobal = {};
        this.updated = false;
        const json = localStorage.getItem("settings.global");
        try {
            this.cacheGlobal = JSON.parse(json);
        }
        catch (error) {
            log_1.log.error(log_1.LogCategory.GENERAL, tr("Failed to load global settings!\nJson: %s\nError: %o"), json, error);
            const show_popup = () => {
                modal_1.createErrorModal(tr("Failed to load global settings"), tr("Failed to load global client settings!\nLookup console for more information.")).open();
            };
            if (!loader.finished())
                loader.register_task(loader.Stage.LOADED, {
                    priority: 0,
                    name: "Settings error",
                    function: () => __awaiter(this, void 0, void 0, function* () { return show_popup(); })
                });
            else
                show_popup();
        }
        if (!this.cacheGlobal)
            this.cacheGlobal = {};
        this.saveWorker = setInterval(() => {
            if (this.updated)
                this.save();
        }, 5 * 1000);
    }
    static initialize() {
        exports.settings = new Settings();
    }
    static_global(key, _default) {
        const actual_default = typeof (_default) === "undefined" && typeof (key) === "object" && 'default_value' in key ? key.default_value : _default;
        const default_object = { seed: Math.random() };
        let _static = this.static(key, default_object, typeof _default);
        if (_static !== default_object)
            return StaticSettings.transformStO(_static, actual_default);
        return this.global(key, actual_default);
    }
    global(key, _default) {
        const actual_default = typeof (_default) === "undefined" && typeof (key) === "object" && 'default_value' in key ? key.default_value : _default;
        return StaticSettings.resolveKey(Settings.keyify(key), actual_default, key => this.cacheGlobal[key]);
    }
    changeGlobal(key, value) {
        key = Settings.keyify(key);
        if (this.cacheGlobal[key.key] == value)
            return;
        this.updated = true;
        this.cacheGlobal[key.key] = StaticSettings.transformOtS(value);
        if (Settings.UPDATE_DIRECT)
            this.save();
    }
    save() {
        this.updated = false;
        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
        if (localStorage.save)
            localStorage.save();
    }
}
exports.Settings = Settings;
Settings.KEY_USER_IS_NEW = {
    key: 'user_is_new_user',
    default_value: true
};
Settings.KEY_DISABLE_COSMETIC_SLOWDOWN = {
    key: 'disable_cosmetic_slowdown',
    description: 'Disable the cosmetic slowdows in some processes, like icon upload.'
};
Settings.KEY_DISABLE_CONTEXT_MENU = {
    key: 'disableContextMenu',
    description: 'Disable the context menu for the channel tree which allows to debug the DOM easier'
};
Settings.KEY_DISABLE_GLOBAL_CONTEXT_MENU = {
    key: 'disableGlobalContextMenu',
    description: 'Disable the general context menu prevention',
    default_value: false
};
Settings.KEY_DISABLE_UNLOAD_DIALOG = {
    key: 'disableUnloadDialog',
    description: 'Disables the unload popup on side closing'
};
Settings.KEY_DISABLE_VOICE = {
    key: 'disableVoice',
    description: 'Disables the voice bridge. If disabled, the audio and codec workers aren\'t required anymore'
};
Settings.KEY_DISABLE_MULTI_SESSION = {
    key: 'disableMultiSession',
    default_value: false,
    require_restart: true
};
Settings.KEY_LOAD_DUMMY_ERROR = {
    key: 'dummy_load_error',
    description: 'Triggers a loading error at the end of the loading process.'
};
Settings.KEY_CONTROL_MUTE_INPUT = {
    key: 'mute_input'
};
Settings.KEY_CONTROL_MUTE_OUTPUT = {
    key: 'mute_output'
};
Settings.KEY_CONTROL_SHOW_QUERIES = {
    key: 'show_server_queries'
};
Settings.KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL = {
    key: 'channel_subscribe_all'
};
Settings.KEY_FLAG_CONNECT_DEFAULT = {
    key: 'connect_default'
};
Settings.KEY_CONNECT_ADDRESS = {
    key: 'connect_address'
};
Settings.KEY_CONNECT_PROFILE = {
    key: 'connect_profile',
    default_value: 'default'
};
Settings.KEY_CONNECT_USERNAME = {
    key: 'connect_username'
};
Settings.KEY_CONNECT_PASSWORD = {
    key: 'connect_password'
};
Settings.KEY_FLAG_CONNECT_PASSWORD = {
    key: 'connect_password_hashed'
};
Settings.KEY_CONNECT_HISTORY = {
    key: 'connect_history'
};
Settings.KEY_CONNECT_NO_DNSPROXY = {
    key: 'connect_no_dnsproxy',
    default_value: false
};
Settings.KEY_CERTIFICATE_CALLBACK = {
    key: 'certificate_callback'
};
Settings.KEY_SOUND_MASTER = {
    key: 'audio_master_volume',
    default_value: 100
};
Settings.KEY_SOUND_MASTER_SOUNDS = {
    key: 'audio_master_volume_sounds',
    default_value: 100
};
Settings.KEY_CHAT_FIXED_TIMESTAMPS = {
    key: 'chat_fixed_timestamps',
    default_value: false,
    description: 'Enables fixed timestamps for chat messages and disabled the updating once (2 seconds ago... etc)'
};
Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS = {
    key: 'chat_colloquial_timestamps',
    default_value: true,
    description: 'Enabled colloquial timestamp formatting like "Yesterday at ..." or "Today at ..."'
};
Settings.KEY_CHAT_COLORED_EMOJIES = {
    key: 'chat_colored_emojies',
    default_value: true,
    description: 'Enables colored emojies powered by Twemoji'
};
Settings.KEY_CHAT_TAG_URLS = {
    key: 'chat_tag_urls',
    default_value: true,
    description: 'Automatically link urls with [url]'
};
Settings.KEY_CHAT_ENABLE_MARKDOWN = {
    key: 'chat_enable_markdown',
    default_value: true,
    description: 'Enabled markdown chat support.'
};
Settings.KEY_CHAT_ENABLE_BBCODE = {
    key: 'chat_enable_bbcode',
    default_value: false,
    description: 'Enabled bbcode support in chat.'
};
Settings.KEY_CHAT_IMAGE_WHITELIST_REGEX = {
    key: 'chat_image_whitelist_regex',
    default_value: JSON.stringify([])
};
Settings.KEY_SWITCH_INSTANT_CHAT = {
    key: 'switch_instant_chat',
    default_value: true,
    description: 'Directly switch to channel chat on channel select'
};
Settings.KEY_SWITCH_INSTANT_CLIENT = {
    key: 'switch_instant_client',
    default_value: true,
    description: 'Directly switch to client info on client select'
};
Settings.KEY_HOSTBANNER_BACKGROUND = {
    key: 'hostbanner_background',
    default_value: false,
    description: 'Enables a default background begind the hostbanner'
};
Settings.KEY_CHANNEL_EDIT_ADVANCED = {
    key: 'channel_edit_advanced',
    default_value: false,
    description: 'Edit channels in advanced mode with a lot more settings'
};
Settings.KEY_PERMISSIONS_SHOW_ALL = {
    key: 'permissions_show_all',
    default_value: false,
    description: 'Show all permissions even thou they dont make sense for the server/channel group'
};
Settings.KEY_TEAFORO_URL = {
    key: "teaforo_url",
    default_value: "https://forum.teaspeak.de/"
};
Settings.KEY_FONT_SIZE = {
    key: "font_size"
};
Settings.KEY_ICON_SIZE = {
    key: "icon_size",
    default_value: 100
};
Settings.KEY_LAST_INVITE_LINK_TYPE = {
    key: "last_invite_link_type",
    default_value: "tea-web"
};
Settings.FN_INVITE_LINK_SETTING = name => {
    return {
        key: 'invite_link_setting_' + name
    };
};
Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE = channel => {
    return {
        key: 'channel_subscribe_mode_' + channel
    };
};
Settings.FN_PROFILE_RECORD = name => {
    return {
        key: 'profile_record' + name
    };
};
Settings.KEYS = (() => {
    const result = [];
    for (const key in Settings) {
        if (!key.toUpperCase().startsWith("KEY_"))
            continue;
        if (key.toUpperCase() == "KEYS")
            continue;
        result.push(key);
    }
    return result;
})();
class ServerSettings extends SettingsBase {
    constructor() {
        super();
        this.cacheServer = {};
        this._server_settings_updated = false;
        this._destroyed = false;
        this._server_save_worker = setInterval(() => {
            if (this._server_settings_updated)
                this.save();
        }, 5 * 1000);
    }
    destroy() {
        this._destroyed = true;
        this._server_unique_id = undefined;
        this.cacheServer = undefined;
        clearInterval(this._server_save_worker);
        this._server_save_worker = undefined;
    }
    server(key, _default) {
        if (this._destroyed)
            throw "destroyed";
        return StaticSettings.resolveKey(Settings.keyify(key), _default, key => this.cacheServer[key]);
    }
    changeServer(key, value) {
        if (this._destroyed)
            throw "destroyed";
        key = Settings.keyify(key);
        if (this.cacheServer[key.key] == value)
            return;
        this._server_settings_updated = true;
        this.cacheServer[key.key] = StaticSettings.transformOtS(value);
        if (Settings.UPDATE_DIRECT)
            this.save();
    }
    setServer(server_unique_id) {
        if (this._destroyed)
            throw "destroyed";
        if (this._server_unique_id) {
            this.save();
            this.cacheServer = {};
            this._server_unique_id = undefined;
        }
        this._server_unique_id = server_unique_id;
        if (this._server_unique_id) {
            const json = localStorage.getItem("settings.server_" + server_unique_id);
            try {
                this.cacheServer = JSON.parse(json);
            }
            catch (error) {
                log_1.log.error(log_1.LogCategory.GENERAL, tr("Failed to load server settings for server %s!\nJson: %s\nError: %o"), server_unique_id, json, error);
            }
            if (!this.cacheServer)
                this.cacheServer = {};
        }
    }
    save() {
        if (this._destroyed)
            throw "destroyed";
        this._server_settings_updated = false;
        if (this._server_unique_id) {
            let server = JSON.stringify(this.cacheServer);
            localStorage.setItem("settings.server_" + this._server_unique_id, server);
            if (localStorage.save)
                localStorage.save();
        }
    }
}
exports.ServerSettings = ServerSettings;


/***/ }),

/***/ "./shared/js/ui/elements/modal.ts":
/*!****************************************!*\
  !*** ./shared/js/ui/elements/modal.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const PPTListener_1 = __webpack_require__(/*! ../../PPTListener */ "./shared/js/PPTListener.ts");
var ElementType;
(function (ElementType) {
    ElementType[ElementType["HEADER"] = 0] = "HEADER";
    ElementType[ElementType["BODY"] = 1] = "BODY";
    ElementType[ElementType["FOOTER"] = 2] = "FOOTER";
})(ElementType = exports.ElementType || (exports.ElementType = {}));
exports.ModalFunctions = {
    divify: function (val) {
        if (val.length > 1)
            return $.spawn("div").append(val);
        return val;
    },
    jqueriefy: function (val, type) {
        if (typeof (val) === "function")
            val = val();
        if (val instanceof jQuery)
            return val;
        if (Array.isArray(val)) {
            if (val.length == 0)
                return undefined;
            return val.map(e => this.jqueriefy(e));
        }
        switch (typeof val) {
            case "string":
                if (type == ElementType.HEADER)
                    return $.spawn("div").addClass("modal-title").text(val);
                return $("<div>" + val + "</div>");
            case "object": return val;
            case "undefined":
                return undefined;
            default:
                console.error(("Invalid type %o"), typeof val);
                return $();
        }
    },
    warpProperties(data) {
        if (data instanceof ModalProperties) {
            return data;
        }
        else {
            const props = new ModalProperties();
            for (const key of Object.keys(data))
                props[key] = data[key];
            return props;
        }
    }
};
class ModalProperties {
    constructor() {
        this.header = () => "HEADER";
        this.body = () => "BODY";
        this.footer = () => "FOOTER";
        this.closeListener = () => { };
        this.height = "auto";
        this.closeable = true;
        this.template_properties = {};
        this.trigger_tab = true;
        this.full_size = false;
    }
    registerCloseListener(listener) {
        if (this.closeListener) {
            if ($.isArray(this.closeListener))
                this.closeListener.push(listener);
            else
                this.closeListener = [this.closeListener, listener];
        }
        else
            this.closeListener = listener;
        return this;
    }
    triggerClose() {
        if ($.isArray(this.closeListener))
            for (let listener of this.closeListener)
                listener();
        else
            this.closeListener();
    }
}
exports.ModalProperties = ModalProperties;
var modal;
(function (modal) {
    function initialize_modals() {
        register_global_events();
    }
    modal.initialize_modals = initialize_modals;
    const scrollSize = 18;
    function scroll_bar_clicked(event) {
        const x = event.pageX, y = event.pageY, e = $(event.target);
        if (e.hasScrollBar("height")) {
            const top = e.offset().top;
            const right = e.offset().left + e.width();
            const bottom = top + e.height();
            const left = right - scrollSize;
            if ((y >= top && y <= bottom) && (x >= left && x <= right))
                return true;
        }
        if (e.hasScrollBar("width")) {
            const bottom = e.offset().top + e.height();
            const top = bottom - scrollSize;
            const left = e.offset().left;
            const right = left + e.width();
            if ((y >= top && y <= bottom) && (x >= left && x <= right))
                return true;
        }
        return false;
    }
    function register_global_events() {
        $(document).on('mousedown', (event) => {
            if (_global_modal_count == 0 || typeof (event.pageX) === "undefined" || typeof (event.pageY) === "undefined")
                return;
            let element = event.target;
            const original = element;
            do {
                if (element.classList.contains('modal-content'))
                    break;
                if (!element.classList.contains('modal'))
                    continue;
                if (element == _global_modal_last && _global_modal_last_time + 100 > Date.now())
                    break;
                if (element === original && scroll_bar_clicked(event)) {
                    _global_modal_last_time = Date.now();
                    break;
                }
                $(element).find("> .modal-dialog > .modal-content > .modal-header .button-modal-close").trigger('click');
                break;
            } while ((element = element.parentElement));
        });
        $(document).on('keyup', (event) => {
            if (_global_modal_count == 0 || typeof (event.target) === "undefined")
                return;
            if (event.key !== "Escape")
                return;
            let element = event.target;
            if (element.nodeName == "HTMLInputElement" || element.nodeName == "HTMLSelectElement" || element.nodeName == "HTMLTextAreaElement")
                return;
            do {
                if (element.classList.contains('modal-content'))
                    break;
                if (!element.classList.contains('modal'))
                    continue;
                if (element == _global_modal_last && _global_modal_last_time + 100 > Date.now())
                    break;
                $(element).find("> .modal-dialog > .modal-content > .modal-header .button-modal-close").trigger('click');
                break;
            } while ((element = element.parentElement));
        });
    }
})(modal = exports.modal || (exports.modal = {}));
modal.initialize_modals();
let _global_modal_count = 0;
let _global_modal_last;
let _global_modal_last_time;
class Modal {
    constructor(props) {
        this.open_listener = [];
        this.close_listener = [];
        this.properties = props;
        this.shown = false;
    }
    get htmlTag() {
        if (!this._htmlTag)
            this._create();
        return this._htmlTag;
    }
    _create() {
        const header = exports.ModalFunctions.jqueriefy(this.properties.header, ElementType.HEADER);
        const body = exports.ModalFunctions.jqueriefy(this.properties.body, ElementType.BODY);
        const footer = exports.ModalFunctions.jqueriefy(this.properties.footer, ElementType.FOOTER);
        const template = $(this.properties.template || "#tmpl_modal");
        const properties = {
            modal_header: header,
            modal_body: body,
            modal_footer: footer,
            closeable: this.properties.closeable,
            full_size: this.properties.full_size
        };
        if (this.properties.template_properties)
            Object.assign(properties, this.properties.template_properties);
        const tag = template.renderTag(properties);
        if (typeof (this.properties.width) !== "undefined" && typeof (this.properties.min_width) !== "undefined")
            tag.find(".modal-content")
                .css("min-width", this.properties.min_width)
                .css("width", this.properties.width);
        else if (typeof (this.properties.width) !== "undefined")
            tag.find(".modal-content").css("min-width", this.properties.width);
        else if (typeof (this.properties.min_width) !== "undefined")
            tag.find(".modal-content").css("min-width", this.properties.min_width);
        this.close_elements = tag.find(".button-modal-close");
        this.close_elements.toggle(this.properties.closeable).on('click', event => {
            if (this.properties.closeable)
                this.close();
        });
        this._htmlTag = tag;
        this._htmlTag.find("input").on('change', event => {
            $(event.target).parents(".form-group").toggleClass('is-filled', !!event.target.value);
        });
        this._htmlTag.on('hide.bs.modal', event => !this.properties.closeable || this.close());
        this._htmlTag.on('hidden.bs.modal', event => this._htmlTag.remove());
    }
    open() {
        if (this.shown)
            return;
        _global_modal_last_time = Date.now();
        _global_modal_last = this.htmlTag[0];
        this.shown = true;
        this.htmlTag.appendTo($("body"));
        _global_modal_count++;
        this.htmlTag.show();
        setTimeout(() => this.htmlTag.addClass('shown'), 0);
        setTimeout(() => {
            for (const listener of this.open_listener)
                listener();
            this.htmlTag.find(".tab").trigger('tab.resize');
        }, 300);
    }
    close() {
        if (!this.shown)
            return;
        _global_modal_count--;
        if (_global_modal_last === this.htmlTag[0])
            _global_modal_last = undefined;
        this.shown = false;
        this.htmlTag.removeClass('shown');
        setTimeout(() => {
            this.htmlTag.remove();
            this._htmlTag = undefined;
        }, 300);
        this.properties.triggerClose();
        for (const listener of this.close_listener)
            listener();
    }
    set_closeable(flag) {
        if (flag === this.properties.closeable)
            return;
        this.properties.closeable = flag;
        this.close_elements.toggle(flag);
    }
}
exports.Modal = Modal;
function createModal(data) {
    return new Modal(exports.ModalFunctions.warpProperties(data));
}
exports.createModal = createModal;
class InputModalProperties extends ModalProperties {
}
exports.InputModalProperties = InputModalProperties;
function createInputModal(headMessage, question, validator, callback, props = {}) {
    props = exports.ModalFunctions.warpProperties(props);
    props.template_properties || (props.template_properties = {});
    props.template_properties.field_title = props.field_title;
    props.template_properties.field_label = props.field_label;
    props.template_properties.field_placeholder = props.field_placeholder;
    props.template_properties.error_message = props.error_message;
    props.template = "#tmpl_modal_input";
    props.header = headMessage;
    props.template_properties.question = exports.ModalFunctions.jqueriefy(question);
    const modal = createModal(props);
    const input = modal.htmlTag.find(".container-value input");
    const button_cancel = modal.htmlTag.find(".button-cancel");
    const button_submit = modal.htmlTag.find(".button-submit");
    let submited = false;
    input.on('keyup change', event => {
        const str = input.val();
        const valid = str !== undefined && validator(str);
        input.attr("pattern", valid ? null : "^[a]{1000}$").toggleClass("is-invalid", !valid);
        button_submit.prop("disabled", !valid);
    });
    input.on('keydown', event => {
        if (event.keyCode !== PPTListener_1.KeyCode.KEY_RETURN || event.shiftKey)
            return;
        if (button_submit.prop("disabled"))
            return;
        button_submit.trigger('click');
    });
    button_submit.on('click', event => {
        if (!submited) {
            submited = true;
            const str = input.val();
            if (str !== undefined && validator(str))
                callback(str);
            else
                callback(false);
        }
        modal.close();
    }).prop("disabled", !validator(""));
    button_cancel.on('click', event => {
        if (!submited) {
            submited = true;
            callback(false);
        }
        modal.close();
    });
    modal.open_listener.push(() => input.focus());
    modal.close_listener.push(() => button_cancel.trigger('click'));
    return modal;
}
exports.createInputModal = createInputModal;
function createErrorModal(header, message, props = { footer: undefined }) {
    props = exports.ModalFunctions.warpProperties(props);
    (props.template_properties || (props.template_properties = {})).header_class = "modal-header-error";
    props.header = header;
    props.body = message;
    const modal = createModal(props);
    modal.htmlTag.find(".modal-body").addClass("modal-error");
    return modal;
}
exports.createErrorModal = createErrorModal;
function createInfoModal(header, message, props = { footer: undefined }) {
    props = exports.ModalFunctions.warpProperties(props);
    (props.template_properties || (props.template_properties = {})).header_class = "modal-header-info";
    props.header = header;
    props.body = message;
    const modal = createModal(props);
    modal.htmlTag.find(".modal-body").addClass("modal-info");
    return modal;
}
exports.createInfoModal = createInfoModal;


/***/ }),

/***/ "./shared/js/ui/frames/chat.ts":
/*!*************************************!*\
  !*** ./shared/js/ui/frames/chat.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __webpack_require__(/*! ../../log */ "./shared/js/log.ts");
var ChatType;
(function (ChatType) {
    ChatType[ChatType["GENERAL"] = 0] = "GENERAL";
    ChatType[ChatType["SERVER"] = 1] = "SERVER";
    ChatType[ChatType["CHANNEL"] = 2] = "CHANNEL";
    ChatType[ChatType["CLIENT"] = 3] = "CLIENT";
})(ChatType = exports.ChatType || (exports.ChatType = {}));
var MessageHelper;
(function (MessageHelper) {
    function htmlEscape(message) {
        const div = document.createElement('div');
        div.innerText = message;
        message = div.innerHTML;
        return message.replace(/ /g, '&nbsp;').split(/<br>/);
    }
    MessageHelper.htmlEscape = htmlEscape;
    function formatElement(object, escape_html = true) {
        if ($.isArray(object)) {
            let result = [];
            for (let element of object)
                result.push(...formatElement(element, escape_html));
            return result;
        }
        else if (typeof (object) == "string") {
            if (object.length == 0)
                return [];
            return escape_html ?
                htmlEscape(object).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 || idx + 1 == array.length ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry)) :
                [$.spawn("div").css("display", "inline-block").html(object)];
        }
        else if (typeof (object) === "object") {
            if (object instanceof $)
                return [object];
            return formatElement("<unknwon object>");
        }
        else if (typeof (object) === "function")
            return formatElement(object(), escape_html);
        else if (typeof (object) === "undefined")
            return formatElement("<undefined>");
        else if (typeof (object) === "number")
            return [$.spawn("a").text(object)];
        return formatElement("<unknown object type " + typeof object + ">");
    }
    MessageHelper.formatElement = formatElement;
    function formatMessage(pattern, ...objects) {
        let begin = 0, found = 0;
        let result = [];
        do {
            found = pattern.indexOf('{', found);
            if (found == -1 || pattern.length <= found + 1) {
                result.push(...formatElement(pattern.substr(begin)));
                break;
            }
            if (found > 0 && pattern[found - 1] == '\\') {
                found++;
                continue;
            }
            result.push(...formatElement(pattern.substr(begin, found - begin)));
            let offset = 0;
            if (pattern[found + 1] == ':') {
                offset++;
                while (pattern[found + 1 + offset] != ':' && found + 1 + offset < pattern.length)
                    offset++;
                const tag = pattern.substr(found + 2, offset - 1);
                offset++;
                if (pattern[found + offset + 1] != '}' && found + 1 + offset < pattern.length) {
                    found++;
                    continue;
                }
                result.push($.spawn(tag));
            }
            else {
                let number;
                while ("0123456789".includes(pattern[found + 1 + offset]))
                    offset++;
                number = parseInt(offset > 0 ? pattern.substr(found + 1, offset) : "0");
                if (pattern[found + offset + 1] != '}') {
                    found++;
                    continue;
                }
                if (objects.length < number)
                    log_1.log.warn(log_1.LogCategory.GENERAL, tr("Message to format contains invalid index (%o)"), number);
                result.push(...formatElement(objects[number]));
            }
            found = found + 1 + offset;
            begin = found + 1;
        } while (found++);
        return result;
    }
    MessageHelper.formatMessage = formatMessage;
    function bbcode_chat(message) {
        return messages.formatter.bbcode.format(message, {
            is_chat_message: true
        });
    }
    MessageHelper.bbcode_chat = bbcode_chat;
    let network;
    (function (network) {
        network.KB = 1024;
        network.MB = 1024 * network.KB;
        network.GB = 1024 * network.MB;
        network.TB = 1024 * network.GB;
        function format_bytes(value, options) {
            options = options || {};
            if (typeof options.exact !== "boolean")
                options.exact = true;
            if (typeof options.unit !== "string")
                options.unit = "Bytes";
            let points = value.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            let v, unit;
            if (value > 2 * network.TB) {
                unit = "TB";
                v = value / network.TB;
            }
            else if (value > network.GB) {
                unit = "GB";
                v = value / network.GB;
            }
            else if (value > network.MB) {
                unit = "MB";
                v = value / network.MB;
            }
            else if (value > network.KB) {
                unit = "KB";
                v = value / network.KB;
            }
            else {
                unit = "";
                v = value;
            }
            let result = "";
            if (options.exact || !unit) {
                result += points;
                if (options.unit) {
                    result += " " + options.unit;
                    if (options.time)
                        result += "/" + options.time;
                }
            }
            if (unit) {
                result += (result ? " / " : "") + v.toFixed(2) + " " + unit;
                if (options.time)
                    result += "/" + options.time;
            }
            return result;
        }
        network.format_bytes = format_bytes;
    })(network = MessageHelper.network || (MessageHelper.network = {}));
    MessageHelper.K = 1000;
    MessageHelper.M = 1000 * MessageHelper.K;
    MessageHelper.G = 1000 * MessageHelper.M;
    MessageHelper.T = 1000 * MessageHelper.G;
    function format_number(value, options) {
        options = Object.assign(options || {}, {});
        let points = value.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        let v, unit;
        if (value > 2 * MessageHelper.T) {
            unit = "T";
            v = value / MessageHelper.T;
        }
        else if (value > MessageHelper.G) {
            unit = "G";
            v = value / MessageHelper.G;
        }
        else if (value > MessageHelper.M) {
            unit = "M";
            v = value / MessageHelper.M;
        }
        else if (value > MessageHelper.K) {
            unit = "K";
            v = value / MessageHelper.K;
        }
        else {
            unit = "";
            v = value;
        }
        if (unit && options.time)
            unit = unit + "/" + options.time;
        return points + " " + (options.unit || "") + (unit ? (" / " + v.toFixed(2) + " " + unit) : "");
    }
    MessageHelper.format_number = format_number;
    MessageHelper.TIME_SECOND = 1000;
    MessageHelper.TIME_MINUTE = 60 * MessageHelper.TIME_SECOND;
    MessageHelper.TIME_HOUR = 60 * MessageHelper.TIME_MINUTE;
    MessageHelper.TIME_DAY = 24 * MessageHelper.TIME_HOUR;
    MessageHelper.TIME_WEEK = 7 * MessageHelper.TIME_DAY;
    function format_time(time, default_value) {
        let result = "";
        if (time > MessageHelper.TIME_WEEK) {
            const amount = Math.floor(time / MessageHelper.TIME_WEEK);
            result += " " + amount + " " + (amount > 1 ? tr("Weeks") : tr("Week"));
            time -= amount * MessageHelper.TIME_WEEK;
        }
        if (time > MessageHelper.TIME_DAY) {
            const amount = Math.floor(time / MessageHelper.TIME_DAY);
            result += " " + amount + " " + (amount > 1 ? tr("Days") : tr("Day"));
            time -= amount * MessageHelper.TIME_DAY;
        }
        if (time > MessageHelper.TIME_HOUR) {
            const amount = Math.floor(time / MessageHelper.TIME_HOUR);
            result += " " + amount + " " + (amount > 1 ? tr("Hours") : tr("Hour"));
            time -= amount * MessageHelper.TIME_HOUR;
        }
        if (time > MessageHelper.TIME_MINUTE) {
            const amount = Math.floor(time / MessageHelper.TIME_MINUTE);
            result += " " + amount + " " + (amount > 1 ? tr("Minutes") : tr("Minute"));
            time -= amount * MessageHelper.TIME_MINUTE;
        }
        if (time > MessageHelper.TIME_SECOND) {
            const amount = Math.floor(time / MessageHelper.TIME_SECOND);
            result += " " + amount + " " + (amount > 1 ? tr("Seconds") : tr("Second"));
            time -= amount * MessageHelper.TIME_SECOND;
        }
        return result.length > 0 ? result.substring(1) : default_value;
    }
    MessageHelper.format_time = format_time;
    let _icon_size_style;
    function set_icon_size(size) {
        if (!_icon_size_style)
            _icon_size_style = $.spawn("style").appendTo($("#style"));
        _icon_size_style.text("\n" +
            ".message > .emoji {\n" +
            "  height: " + size + "!important;\n" +
            "  width: " + size + "!important;\n" +
            "}\n");
    }
    MessageHelper.set_icon_size = set_icon_size;
    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "icon size init",
        function: () => __awaiter(this, void 0, void 0, function* () {
            MessageHelper.set_icon_size((settings.static_global(Settings.KEY_ICON_SIZE) / 100).toFixed(2) + "em");
        }),
        priority: 10
    });
})(MessageHelper = exports.MessageHelper || (exports.MessageHelper = {}));


/***/ }),

/***/ "./shared/js/ui/modal/ModalConnect.ts":
/*!********************************************!*\
  !*** ./shared/js/ui/modal/ModalConnect.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var connection_log;
(function (connection_log) {
    let _history = [];
    function log_connect(address) {
        let entry = _history.find(e => e.address.hostname.toLowerCase() == address.hostname.toLowerCase() && e.address.port == address.port);
        if (!entry) {
            _history.push(entry = {
                last_timestamp: Date.now(),
                first_timestamp: Date.now(),
                address: address,
                clients_online: 0,
                clients_total: 0,
                country: 'unknown',
                name: 'Unknown',
                icon_id: 0,
                total_connection: 0,
                flag_password: false,
                password_hash: undefined
            });
        }
        entry.last_timestamp = Date.now();
        entry.total_connection++;
        _save();
    }
    connection_log.log_connect = log_connect;
    function update_address_info(address, data) {
        _history.filter(e => e.address.hostname.toLowerCase() == address.hostname.toLowerCase() && e.address.port == address.port).forEach(e => {
            for (const key of Object.keys(data)) {
                if (typeof (data[key]) !== "undefined") {
                    e[key] = data[key];
                }
            }
        });
        _save();
    }
    connection_log.update_address_info = update_address_info;
    function update_address_password(address, password_hash) {
        _history.filter(e => e.address.hostname.toLowerCase() == address.hostname.toLowerCase() && e.address.port == address.port).forEach(e => {
            e.password_hash = password_hash;
        });
        _save();
    }
    connection_log.update_address_password = update_address_password;
    function _save() {
        settings.changeGlobal(Settings.KEY_CONNECT_HISTORY, JSON.stringify(_history));
    }
    function history() {
        return _history.sort((a, b) => b.last_timestamp - a.last_timestamp);
    }
    connection_log.history = history;
    function delete_entry(address) {
        _history = _history.filter(e => !(e.address.hostname.toLowerCase() == address.hostname.toLowerCase() && e.address.port == address.port));
        _save();
    }
    connection_log.delete_entry = delete_entry;
    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: 'connection history load',
        priority: 1,
        function: () => __awaiter(this, void 0, void 0, function* () {
            _history = [];
            try {
                _history = JSON.parse(settings.global(Settings.KEY_CONNECT_HISTORY, "[]"));
            }
            catch (error) {
                log.warn(LogCategory.CLIENT, tr("Failed to load connection history: {}"), error);
            }
        })
    });
})(connection_log = exports.connection_log || (exports.connection_log = {}));
var Modals;
(function (Modals) {
    function spawnConnectModal(options, defaultHost = { url: "ts.TeaSpeak.de", enforce: false }, connect_profile) {
        let selected_profile;
        const random_id = (() => {
            const array = new Uint32Array(10);
            window.crypto.getRandomValues(array);
            return array.join("");
        })();
        const modal = createModal({
            header: tr("Connect to a server"),
            body: $("#tmpl_connect").renderTag({
                client: native_client,
                forum_path: settings.static("forum_path"),
                password_id: random_id,
                multi_tab: !settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION),
                default_connect_new_tab: typeof (options.default_connect_new_tab) === "boolean" && options.default_connect_new_tab
            }),
            footer: () => undefined,
            min_width: "28em"
        });
        modal.htmlTag.find(".modal-body").addClass("modal-connect");
        {
            const container_last_servers = modal.htmlTag.find(".container-last-servers");
            const button = modal.htmlTag.find(".button-toggle-last-servers");
            const set_show = shown => {
                container_last_servers.toggleClass('shown', shown);
                button.find(".arrow").toggleClass('down', shown).toggleClass('up', !shown);
                settings.changeGlobal("connect_show_last_servers", shown);
            };
            button.on('click', event => {
                set_show(!container_last_servers.hasClass("shown"));
            });
            set_show(settings.static_global("connect_show_last_servers", false));
        }
        const apply = (header, body, footer) => {
            const container_last_server_body = modal.htmlTag.find(".container-last-servers .table .body");
            const container_empty = container_last_server_body.find(".body-empty");
            let current_connect_data;
            const button_connect = footer.find(".button-connect");
            const button_connect_tab = footer.find(".button-connect-new-tab");
            const button_manage = body.find(".button-manage-profiles");
            const input_profile = body.find(".container-select-profile select");
            const input_address = body.find(".container-address input");
            const input_nickname = body.find(".container-nickname input");
            const input_password = body.find(".container-password input");
            let updateFields = (reset_current_data) => {
                if (reset_current_data) {
                    current_connect_data = undefined;
                    container_last_server_body.find(".selected").removeClass("selected");
                }
                let address = input_address.val().toString();
                settings.changeGlobal(Settings.KEY_CONNECT_ADDRESS, address);
                let flag_address = !!address.match(Modals.Regex.IP_V4) || !!address.match(Modals.Regex.IP_V6) || !!address.match(Modals.Regex.DOMAIN);
                let nickname = input_nickname.val().toString();
                if (nickname)
                    settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, nickname);
                else
                    nickname = input_nickname.attr("placeholder") || "";
                let flag_nickname = nickname.length >= 3 && nickname.length <= 32;
                input_address.attr('pattern', flag_address ? null : '^[a]{1000}$').toggleClass('is-invalid', !flag_address);
                input_nickname.attr('pattern', flag_nickname ? null : '^[a]{1000}$').toggleClass('is-invalid', !flag_nickname);
                const flag_disabled = !flag_nickname || !flag_address || !selected_profile || !selected_profile.valid();
                button_connect.prop("disabled", flag_disabled);
                button_connect_tab.prop("disabled", flag_disabled);
            };
            input_address.val(defaultHost.enforce ? defaultHost.url : settings.static_global(Settings.KEY_CONNECT_ADDRESS, defaultHost.url));
            input_address
                .on("keyup", () => updateFields(true))
                .on('keydown', event => {
                if (event.keyCode == KeyCode.KEY_ENTER && !event.shiftKey)
                    button_connect.trigger('click');
            });
            button_manage.on('click', event => {
                const modal = Modals.spawnSettingsModal("identity-profiles");
                modal.close_listener.push(() => {
                    input_profile.trigger('change');
                });
                return true;
            });
            {
                for (const profile of profiles.profiles()) {
                    input_profile.append($.spawn("option").text(profile.profile_name).val(profile.id));
                }
                input_profile.on('change', event => {
                    selected_profile = profiles.find_profile(input_profile.val()) || profiles.default_profile();
                    {
                        settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, undefined);
                        input_nickname
                            .attr('placeholder', selected_profile.connect_username() || "Another TeaSpeak user")
                            .val("");
                    }
                    settings.changeGlobal(Settings.KEY_CONNECT_PROFILE, selected_profile.id);
                    input_profile.toggleClass("is-invalid", !selected_profile || !selected_profile.valid());
                    updateFields(true);
                });
                input_profile.val(connect_profile && connect_profile.profile ?
                    connect_profile.profile.id :
                    settings.static_global(Settings.KEY_CONNECT_PROFILE, "default")).trigger('change');
            }
            const last_nickname = settings.static_global(Settings.KEY_CONNECT_USERNAME, undefined);
            if (last_nickname)
                settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, last_nickname);
            input_nickname.val(last_nickname);
            input_nickname.on("keyup", () => updateFields(true));
            setTimeout(() => updateFields(false), 100);
            const server_address = () => {
                let address = input_address.val().toString();
                if (address.match(Modals.Regex.IP_V6) && !address.startsWith("["))
                    return "[" + address + "]";
                return address;
            };
            button_connect.on('click', event => {
                modal.close();
                const connection = server_connections.active_connection_handler();
                if (connection) {
                    connection.startConnection(current_connect_data ? current_connect_data.address.hostname + ":" + current_connect_data.address.port : server_address(), selected_profile, true, {
                        nickname: input_nickname.val().toString() || input_nickname.attr("placeholder"),
                        password: (current_connect_data && current_connect_data.password_hash) ? { password: current_connect_data.password_hash, hashed: true } : { password: input_password.val().toString(), hashed: false }
                    });
                }
                else {
                    button_connect_tab.trigger('click');
                }
            });
            button_connect_tab.on('click', event => {
                modal.close();
                const connection = server_connections.spawn_server_connection_handler();
                server_connections.set_active_connection_handler(connection);
                connection.startConnection(current_connect_data ? current_connect_data.address.hostname + ":" + current_connect_data.address.port : server_address(), selected_profile, true, {
                    nickname: input_nickname.val().toString() || input_nickname.attr("placeholder"),
                    password: (current_connect_data && current_connect_data.password_hash) ? { password: current_connect_data.password_hash, hashed: true } : { password: input_password.val().toString(), hashed: false }
                });
            });
            {
                for (const entry of connection_log.history().slice(0, 10)) {
                    $.spawn("div").addClass("row").append($.spawn("div").addClass("column delete").append($.spawn("div").addClass("icon_em client-delete")).on('click', event => {
                        event.preventDefault();
                        const row = $(event.target).parents('.row');
                        row.hide(250, () => {
                            row.detach();
                        });
                        connection_log.delete_entry(entry.address);
                        container_empty.toggle(container_last_server_body.children().length > 1);
                    })).append($.spawn("div").addClass("column name").append([
                        IconManager.generate_tag(IconManager.load_cached_icon(entry.icon_id)),
                        $.spawn("a").text(entry.name)
                    ])).append($.spawn("div").addClass("column address").text(entry.address.hostname + (entry.address.port != 9987 ? (":" + entry.address.port) : ""))).append($.spawn("div").addClass("column password").text(entry.flag_password ? tr("Yes") : tr("No"))).append($.spawn("div").addClass("column country-name").append([
                        $.spawn("div").addClass("country flag-" + entry.country.toLowerCase()),
                        $.spawn("a").text(i18n.country_name(entry.country, tr("Global")))
                    ])).append($.spawn("div").addClass("column clients").text(entry.clients_online + "/" + entry.clients_total)).append($.spawn("div").addClass("column connections").text(entry.total_connection + "")).on('click', event => {
                        if (event.isDefaultPrevented())
                            return;
                        event.preventDefault();
                        current_connect_data = entry;
                        container_last_server_body.find(".selected").removeClass("selected");
                        $(event.target).parent('.row').addClass('selected');
                        input_address.val(entry.address.hostname + (entry.address.port != 9987 ? (":" + entry.address.port) : ""));
                        input_password.val(entry.flag_password && entry.password_hash ? "WolverinDEV Yeahr!" : "").trigger('change');
                    }).on('dblclick', event => {
                        current_connect_data = entry;
                        button_connect.trigger('click');
                    }).appendTo(container_last_server_body);
                    container_empty.toggle(false);
                }
            }
        };
        apply(modal.htmlTag, modal.htmlTag, modal.htmlTag);
        modal.open();
        return;
    }
    Modals.spawnConnectModal = spawnConnectModal;
    Modals.Regex = {
        DOMAIN: /^(localhost|((([a-zA-Z0-9_-]{0,63}\.){0,253})?[a-zA-Z0-9_-]{0,63}\.[a-zA-Z]{2,64}))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,46}))$/,
        IP_V4: /(^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
        IP_V6: /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,
        IP: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
    };
})(Modals = exports.Modals || (exports.Modals = {}));


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vYW1kLW9wdGlvbnMuanMiLCJ3ZWJwYWNrOi8vLyh3ZWJwYWNrKS9idWlsZGluL2dsb2JhbC5qcyIsIndlYnBhY2s6Ly8vLi9zaGFyZWQvanMvQnJvd3NlcklQQy50cyIsIndlYnBhY2s6Ly8vLi9zaGFyZWQvanMvUFBUTGlzdGVuZXIudHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL2Nvbm5lY3Rpb24vQ29tbWFuZEhlbHBlci50cyIsIndlYnBhY2s6Ly8vLi9zaGFyZWQvanMvY29ubmVjdGlvbi9Db25uZWN0aW9uQmFzZS50cyIsIndlYnBhY2s6Ly8vLi9zaGFyZWQvanMvY29ubmVjdGlvbi9TZXJ2ZXJDb25uZWN0aW9uRGVjbGFyYXRpb24udHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL2NyeXB0by9hc24xLnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy9jcnlwdG8vc2hhLnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy9jcnlwdG8vdWlkLnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy9pMThuL2xvY2FsaXplLnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy9tYWluLnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy9wcm9maWxlcy9Db25uZWN0aW9uUHJvZmlsZS50cyIsIndlYnBhY2s6Ly8vLi9zaGFyZWQvanMvcHJvZmlsZXMvSWRlbnRpdHkudHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL3Byb2ZpbGVzL2lkZW50aXRpZXMvTmFtZUlkZW50aXR5LnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy9wcm9maWxlcy9pZGVudGl0aWVzL1RlYUZvcnVtSWRlbnRpdHkudHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL3Byb2ZpbGVzL2lkZW50aXRpZXMvVGVhbVNwZWFrSWRlbnRpdHkudHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL3Byb2ZpbGVzL2lkZW50aXRpZXMvdGVhc3BlYWstZm9ydW0udHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL3NldHRpbmdzLnRzIiwid2VicGFjazovLy8uL3NoYXJlZC9qcy91aS9lbGVtZW50cy9tb2RhbC50cyIsIndlYnBhY2s6Ly8vLi9zaGFyZWQvanMvdWkvZnJhbWVzL2NoYXQudHMiLCJ3ZWJwYWNrOi8vLy4vc2hhcmVkL2pzL3VpL21vZGFsL01vZGFsQ29ubmVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO1FBQUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7OztRQUdBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwwQ0FBMEMsZ0NBQWdDO1FBQzFFO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0Esd0RBQXdELGtCQUFrQjtRQUMxRTtRQUNBLGlEQUFpRCxjQUFjO1FBQy9EOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQSx5Q0FBeUMsaUNBQWlDO1FBQzFFLGdIQUFnSCxtQkFBbUIsRUFBRTtRQUNySTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDJCQUEyQiwwQkFBMEIsRUFBRTtRQUN2RCxpQ0FBaUMsZUFBZTtRQUNoRDtRQUNBO1FBQ0E7O1FBRUE7UUFDQSxzREFBc0QsK0RBQStEOztRQUVySDtRQUNBOzs7UUFHQTtRQUNBOzs7Ozs7Ozs7Ozs7QUNsRkE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHVCQUF1QixzQkFBc0I7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLHFDQUFxQzs7QUFFckM7QUFDQTtBQUNBOztBQUVBLDJCQUEyQjtBQUMzQjtBQUNBO0FBQ0E7QUFDQSw0QkFBNEIsVUFBVTs7Ozs7Ozs7Ozs7O0FDdkx0QztBQUNBOzs7Ozs7Ozs7Ozs7O0FDREE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFF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LEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBRWxDLEtBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUNyQixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDcEUsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2FBQ3RDO1lBRUQsS0FBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN6QixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQzdCO1lBRUQsT0FBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBRTFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2hELENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFFMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDN0I7WUFFRCxPQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQzdCO1lBRUQsT0FBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBRTFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFFMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDN0I7WUFFRCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRztZQUNqQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFFaEIsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUV6RSxPQUFPLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUM5RCxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDM0QsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzFELFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztnQkFDbEQsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzNELFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUMzRCxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDMUQsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO2dCQUNsRCxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDM0QsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzNELFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUMxRCxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7Z0JBQ2xELFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUMzRCxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDM0QsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzFELFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztnQkFDbEQsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzNELFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUMzRCxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDMUQsU0FBUyxDQUFDLENB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LEdBQUcsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzdCLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBTSxFQUFFLENBQUM7UUFDN0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFTLENBQUMsQ0FBQztRQUM3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQVcsQ0FBQyxDQUFDO1FBRzdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkU7SUFHRCxJQUFJLGFBQWEsSUFBSSxDQUFDLEVBQUU7UUFDcEIsS0FBSyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUzQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBR3ZCLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBTSxDQUFDLENBQUM7UUFFdkIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0tBQ2hEO1NBQU0sSUFBSSxhQUFhLElBQUksQ0FBQyxFQUFFO1FBQzNCLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTNELENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFNLENBQUMsQ0FBQztRQUcxQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQVEsQ0FBQyxDQUFDO1FBRTFC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QUUsQ0FBQyxDQUFDLENBQUM7d0JBQzNHLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNqSCxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUN0QixvQkFBb0IsR0FBRyxLQUFLLENBQUM7d0JBQzdCLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3BDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO29CQUN4QyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNqQzthQUNKO1FBQ0wsQ0FBQyxDQUFDO1FBQ0YsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbkQsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2IsT0FBTztJQUNYLENBQUM7SUFsT2Usd0JBQWlCLG9CQWtPaEM7SUFFWSxZQUFLLEdBQUc7UUFFakIsTUFBTSxFQUFFLG9LQUFvSztRQUU1SyxLQUFLLEVBQUUsc0tBQXNLO1FBQzdLLEtBQUssRUFBRSxxcEJBQXFwQjtRQUM1cEIsRUFBRSxFQUFFLG13Q0FBbXdDO0tBQzF3QyxDQUFDO0FBQ04sQ0FBQyxFQTdPZ0IsTUFBTSxHQUFOLGNBQU0sS0FBTixjQUFNLFFBNk90QiIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gXCIuL3NoYXJlZC9qcy9tYWluLnRzXCIpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbHMgX193ZWJwYWNrX2FtZF9vcHRpb25zX18gKi9cbm1vZHVsZS5leHBvcnRzID0gX193ZWJwYWNrX2FtZF9vcHRpb25zX187XG4iLCJ2YXIgZztcblxuLy8gVGhpcyB3b3JrcyBpbiBub24tc3RyaWN0IG1vZGVcbmcgPSAoZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzO1xufSkoKTtcblxudHJ5IHtcblx0Ly8gVGhpcyB3b3JrcyBpZiBldmFsIGlzIGFsbG93ZWQgKHNlZSBDU1ApXG5cdGcgPSBnIHx8IG5ldyBGdW5jdGlvbihcInJldHVybiB0aGlzXCIpKCk7XG59IGNhdGNoIChlKSB7XG5cdC8vIFRoaXMgd29ya3MgaWYgdGhlIHdpbmRvdyByZWZlcmVuY2UgaXMgYXZhaWxhYmxlXG5cdGlmICh0eXBlb2Ygd2luZG93ID09PSBcIm9iamVjdFwiKSBnID0gd2luZG93O1xufVxuXG4vLyBnIGNhbiBzdGlsbCBiZSB1bmRlZmluZWQsIGJ1dCBub3RoaW5nIHRvIGRvIGFib3V0IGl0Li4uXG4vLyBXZSByZXR1cm4gdW5kZWZpbmVkLCBpbnN0ZWFkIG9mIG5vdGhpbmcgaGVyZSwgc28gaXQnc1xuLy8gZWFzaWVyIHRvIGhhbmRsZSB0aGlzIGNhc2UuIGlmKCFnbG9iYWwpIHsgLi4ufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGc7XG4iLCJleHBvcnQgaW50ZXJmYWNlIFdpbmRvdyB7XHJcbiAgICBCcm9hZGNhc3RDaGFubmVsOiBCcm9hZGNhc3RDaGFubmVsO1xyXG59XHJcblxyXG5leHBvcnQgbmFtZXNwYWNlIGJpcGMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBCcm9hZGNhc3RNZXNzYWdlIHtcclxuICAgICAgICB0aW1lc3RhbXA6IG51bWJlcjtcclxuICAgICAgICByZWNlaXZlcjogc3RyaW5nO1xyXG4gICAgICAgIHNlbmRlcjogc3RyaW5nO1xyXG5cclxuICAgICAgICB0eXBlOiBzdHJpbmc7XHJcbiAgICAgICAgZGF0YTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHV1aWR2NCgpIHtcclxuICAgICAgICByZXR1cm4gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBNYXRoLnJhbmRvbSgpICogMTYgfCAwLCB2ID0gYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdi50b1N0cmluZygxNik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIFByb2Nlc3NRdWVyeSB7XHJcbiAgICAgICAgdGltZXN0YW1wOiBudW1iZXJcclxuICAgICAgICBxdWVyeV9pZDogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ2hhbm5lbE1lc3NhZ2Uge1xyXG4gICAgICAgIGNoYW5uZWxfaWQ6IHN0cmluZztcclxuICAgICAgICB0eXBlOiBzdHJpbmc7XHJcbiAgICAgICAgZGF0YTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUHJvY2Vzc1F1ZXJ5UmVzcG9uc2Uge1xyXG4gICAgICAgIHJlcXVlc3RfdGltZXN0YW1wOiBudW1iZXJcclxuICAgICAgICByZXF1ZXN0X3F1ZXJ5X2lkOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGRldmljZV9pZDogc3RyaW5nO1xyXG4gICAgICAgIHByb3RvY29sOiBudW1iZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBDZXJ0aWZpY2F0ZUFjY2VwdENhbGxiYWNrIHtcclxuICAgICAgICByZXF1ZXN0X2lkOiBzdHJpbmc7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIENlcnRpZmljYXRlQWNjZXB0U3VjY2VlZGVkIHsgfVxyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNpY0lQQ0hhbmRsZXIge1xyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0aWMgcmVhZG9ubHkgQlJPQURDQVNUX1VOSVFVRV9JRCA9IFwiMDAwMDAwMDAtMDAwMC00MDAwLTAwMDAtMDAwMDAwMDAwMDAwXCI7XHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRpYyByZWFkb25seSBQUk9UT0NPTF9WRVJTSU9OID0gMTtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIF9jaGFubmVsczogQ2hhbm5lbFtdID0gW107XHJcbiAgICAgICAgcHJvdGVjdGVkIHVuaXF1ZV9pZDtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKCkgeyB9XHJcblxyXG4gICAgICAgIHNldHVwKCkge1xyXG4gICAgICAgICAgICB0aGlzLnVuaXF1ZV9pZCA9IHV1aWR2NCgpOyAvKiBsZXRzIGdldCBhbiB1bmlxdWUgaWRlbnRpZmllciAqL1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0X2xvY2FsX2FkZHJlc3MoKSB7IHJldHVybiB0aGlzLnVuaXF1ZV9pZDsgfVxyXG5cclxuICAgICAgICBhYnN0cmFjdCBzZW5kX21lc3NhZ2UodHlwZTogc3RyaW5nLCBkYXRhOiBhbnksIHRhcmdldD86IHN0cmluZyk7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBoYW5kbGVfbWVzc2FnZShtZXNzYWdlOiBCcm9hZGNhc3RNZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIC8vbG9nLnRyYWNlKExvZ0NhdGVnb3J5LklQQywgdHIoXCJSZWNlaXZlZCBtZXNzYWdlICVvXCIpLCBtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgICAgIGlmKG1lc3NhZ2UucmVjZWl2ZXIgPT09IEJhc2ljSVBDSGFuZGxlci5CUk9BRENBU1RfVU5JUVVFX0lEKSB7XHJcbiAgICAgICAgICAgICAgICBpZihtZXNzYWdlLnR5cGUgPT0gXCJwcm9jZXNzLXF1ZXJ5XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlY2VpdmVkIGEgZGV2aWNlIHF1ZXJ5IGZyb20gJXMuXCIpLCBtZXNzYWdlLnNlbmRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kX21lc3NhZ2UoXCJwcm9jZXNzLXF1ZXJ5LXJlc3BvbnNlXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF9xdWVyeV9pZDogKDxQcm9jZXNzUXVlcnk+bWVzc2FnZS5kYXRhKS5xdWVyeV9pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF90aW1lc3RhbXA6ICg8UHJvY2Vzc1F1ZXJ5Pm1lc3NhZ2UuZGF0YSkudGltZXN0YW1wLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGV2aWNlX2lkOiB0aGlzLnVuaXF1ZV9pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IEJhc2ljSVBDSGFuZGxlci5QUk9UT0NPTF9WRVJTSU9OXHJcbiAgICAgICAgICAgICAgICAgICAgfSBhcyBQcm9jZXNzUXVlcnlSZXNwb25zZSwgbWVzc2FnZS5zZW5kZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmKG1lc3NhZ2UucmVjZWl2ZXIgPT09IHRoaXMudW5pcXVlX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBpZihtZXNzYWdlLnR5cGUgPT0gXCJwcm9jZXNzLXF1ZXJ5LXJlc3BvbnNlXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZTogUHJvY2Vzc1F1ZXJ5UmVzcG9uc2UgPSBtZXNzYWdlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodGhpcy5fcXVlcnlfcmVzdWx0c1tyZXNwb25zZS5yZXF1ZXN0X3F1ZXJ5X2lkXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcXVlcnlfcmVzdWx0c1tyZXNwb25zZS5yZXF1ZXN0X3F1ZXJ5X2lkXS5wdXNoKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlY2VpdmVkIGEgcXVlcnkgcmVzcG9uc2UgZm9yIGFuIHVua25vd24gcmVxdWVzdC5cIikpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKG1lc3NhZ2UudHlwZSA9PSBcImNlcnRpZmljYXRlLWFjY2VwdC1jYWxsYmFja1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YTogQ2VydGlmaWNhdGVBY2NlcHRDYWxsYmFjayA9IG1lc3NhZ2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICBpZighdGhpcy5fY2VydF9hY2NlcHRfY2FsbGJhY2tzW2RhdGEucmVxdWVzdF9pZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlY2VpdmVkIGNlcnRpZmljYXRlIGFjY2VwdCBjYWxsYmFjayBmb3IgYW4gdW5rbm93biByZXF1ZXN0IElELlwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2VydF9hY2NlcHRfY2FsbGJhY2tzW2RhdGEucmVxdWVzdF9pZF0oKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2VydF9hY2NlcHRfY2FsbGJhY2tzW2RhdGEucmVxdWVzdF9pZF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZF9tZXNzYWdlKFwiY2VydGlmaWNhdGUtYWNjZXB0LXN1Y2NlZWRlZFwiLCB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0gYXMgQ2VydGlmaWNhdGVBY2NlcHRTdWNjZWVkZWQsIG1lc3NhZ2Uuc2VuZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKG1lc3NhZ2UudHlwZSA9PSBcImNlcnRpZmljYXRlLWFjY2VwdC1zdWNjZWVkZWRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCF0aGlzLl9jZXJ0X2FjY2VwdF9zdWNjZWVkZWRbbWVzc2FnZS5zZW5kZXJdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LklQQywgdHIoXCJSZWNlaXZlZCBjZXJ0aWZpY2F0ZSBhY2NlcHQgc3VjY2VlZGVkLCBidXQgaGF2ZW4ndCBhIGNhbGxiYWNrLlwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2VydF9hY2NlcHRfc3VjY2VlZGVkW21lc3NhZ2Uuc2VuZGVyXSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihtZXNzYWdlLnR5cGUgPT09IFwiY2hhbm5lbFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBDaGFubmVsTWVzc2FnZSA9IG1lc3NhZ2UuZGF0YTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY2hhbm5lbF9pbnZva2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBmb3IoY29uc3QgY2hhbm5lbCBvZiB0aGlzLl9jaGFubmVscylcclxuICAgICAgICAgICAgICAgICAgICBpZihjaGFubmVsLmNoYW5uZWxfaWQgPT09IGRhdGEuY2hhbm5lbF9pZCAmJiAodHlwZW9mKGNoYW5uZWwudGFyZ2V0X2lkKSA9PT0gXCJ1bmRlZmluZWRcIiB8fCBjaGFubmVsLnRhcmdldF9pZCA9PT0gbWVzc2FnZS5zZW5kZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNoYW5uZWwubWVzc2FnZV9oYW5kbGVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5tZXNzYWdlX2hhbmRsZXIobWVzc2FnZS5zZW5kZXIsIG1lc3NhZ2UucmVjZWl2ZXIgPT09IEJhc2ljSVBDSGFuZGxlci5CUk9BRENBU1RfVU5JUVVFX0lELCBkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbF9pbnZva2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighY2hhbm5lbF9pbnZva2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHRyKFwiUmVjZWl2ZWQgY2hhbm5lbCBtZXNzYWdlIGZvciB1bmtub3duIGNoYW5uZWwgKCVzKVwiKSwgZGF0YS5jaGFubmVsX2lkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3JlYXRlX2NoYW5uZWwodGFyZ2V0X2lkPzogc3RyaW5nLCBjaGFubmVsX2lkPzogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIGxldCBjaGFubmVsOiBDaGFubmVsID0ge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0X2lkOiB0YXJnZXRfaWQsXHJcbiAgICAgICAgICAgICAgICBjaGFubmVsX2lkOiBjaGFubmVsX2lkIHx8IHV1aWR2NCgpLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZV9oYW5kbGVyOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICBzZW5kX21lc3NhZ2U6ICh0eXBlOiBzdHJpbmcsIGRhdGE6IGFueSwgdGFyZ2V0Pzogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHRhcmdldCAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgY2hhbm5lbC50YXJnZXRfaWQgPT09IFwic3RyaW5nXCIgJiYgdGFyZ2V0ICE9IGNoYW5uZWwudGFyZ2V0X2lkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJ0YXJnZXQgaWQgZG9lcyBub3QgbWF0Y2ggY2hhbm5lbCB0YXJnZXRcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZF9tZXNzYWdlKFwiY2hhbm5lbFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5uZWxfaWQ6IGNoYW5uZWwuY2hhbm5lbF9pZFxyXG4gICAgICAgICAgICAgICAgICAgIH0gYXMgQ2hhbm5lbE1lc3NhZ2UsIHRhcmdldCB8fCBjaGFubmVsLnRhcmdldF9pZCB8fCBCYXNpY0lQQ0hhbmRsZXIuQlJPQURDQVNUX1VOSVFVRV9JRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9jaGFubmVscy5wdXNoKGNoYW5uZWwpO1xyXG4gICAgICAgICAgICByZXR1cm4gY2hhbm5lbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNoYW5uZWxzKCkgOiBDaGFubmVsW10geyByZXR1cm4gdGhpcy5fY2hhbm5lbHM7IH1cclxuXHJcbiAgICAgICAgZGVsZXRlX2NoYW5uZWwoY2hhbm5lbDogQ2hhbm5lbCkge1xyXG4gICAgICAgICAgICB0aGlzLl9jaGFubmVscyA9IHRoaXMuX2NoYW5uZWxzLmZpbHRlcihlID0+IGUgIT09IGNoYW5uZWwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfcXVlcnlfcmVzdWx0czoge1trZXk6IHN0cmluZ106UHJvY2Vzc1F1ZXJ5UmVzcG9uc2VbXX0gPSB7fTtcclxuICAgICAgICBhc3luYyBxdWVyeV9wcm9jZXNzZXModGltZW91dD86IG51bWJlcikgOiBQcm9taXNlPFByb2Nlc3NRdWVyeVJlc3BvbnNlW10+IHtcclxuICAgICAgICAgICAgY29uc3QgcXVlcnlfaWQgPSB1dWlkdjQoKTtcclxuICAgICAgICAgICAgdGhpcy5fcXVlcnlfcmVzdWx0c1txdWVyeV9pZF0gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VuZF9tZXNzYWdlKFwicHJvY2Vzcy1xdWVyeVwiLCB7XHJcbiAgICAgICAgICAgICAgICBxdWVyeV9pZDogcXVlcnlfaWQsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcclxuICAgICAgICAgICAgfSBhcyBQcm9jZXNzUXVlcnkpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRpbWVvdXQgfHwgMjUwKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX3F1ZXJ5X3Jlc3VsdHNbcXVlcnlfaWRdO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fcXVlcnlfcmVzdWx0c1txdWVyeV9pZF07XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIF9jZXJ0X2FjY2VwdF9jYWxsYmFja3M6IHtba2V5OiBzdHJpbmddOigoKSA9PiBhbnkpfSA9IHt9O1xyXG4gICAgICAgIHJlZ2lzdGVyX2NlcnRpZmljYXRlX2FjY2VwdF9jYWxsYmFjayhjYWxsYmFjazogKCkgPT4gYW55KSA6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gdXVpZHY0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2NlcnRfYWNjZXB0X2NhbGxiYWNrc1tpZF0gPSBjYWxsYmFjaztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5pcXVlX2lkICsgXCI6XCIgKyBpZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgX2NlcnRfYWNjZXB0X3N1Y2NlZWRlZDoge1tzZW5kZXI6IHN0cmluZ106KCgpID0+IGFueSl9ID0ge307XHJcbiAgICAgICAgcG9zdF9jZXJ0aWZpY2F0ZV9hY2NwZWN0ZWQoaWQ6IHN0cmluZywgdGltZW91dD86IG51bWJlcikgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBpZC5zcGxpdChcIjpcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lb3V0X2lkID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2NlcnRfYWNjZXB0X3N1Y2NlZWRlZFtkYXRhWzBdXTtcclxuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dF9pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwidGltZW91dFwiKTtcclxuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQgfHwgMjUwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2NlcnRfYWNjZXB0X3N1Y2NlZWRlZFtkYXRhWzBdXSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2VydF9hY2NlcHRfc3VjY2VlZGVkW2RhdGFbMF1dO1xyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0X2lkKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kX21lc3NhZ2UoXCJjZXJ0aWZpY2F0ZS1hY2NlcHQtY2FsbGJhY2tcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RfaWQ6IGRhdGFbMV1cclxuICAgICAgICAgICAgICAgIH0gYXMgQ2VydGlmaWNhdGVBY2NlcHRDYWxsYmFjaywgZGF0YVswXSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ2hhbm5lbCB7XHJcbiAgICAgICAgcmVhZG9ubHkgY2hhbm5lbF9pZDogc3RyaW5nO1xyXG4gICAgICAgIHRhcmdldF9pZD86IHN0cmluZztcclxuXHJcbiAgICAgICAgbWVzc2FnZV9oYW5kbGVyOiAocmVtb3RlX2lkOiBzdHJpbmcsIGJyb2FkY2FzdDogYm9vbGVhbiwgbWVzc2FnZTogQ2hhbm5lbE1lc3NhZ2UpID0+IGFueTtcclxuICAgICAgICBzZW5kX21lc3NhZ2UodHlwZTogc3RyaW5nLCBtZXNzYWdlOiBhbnksIHRhcmdldD86IHN0cmluZyk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgQnJvYWRjYXN0Q2hhbm5lbElQQyBleHRlbmRzIEJhc2ljSVBDSGFuZGxlciB7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgQ0hBTk5FTF9OQU1FID0gXCJUZWFTcGVhay1XZWJcIjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjaGFubmVsOiBCcm9hZGNhc3RDaGFubmVsO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldHVwKCkge1xyXG4gICAgICAgICAgICBzdXBlci5zZXR1cCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IEJyb2FkY2FzdENoYW5uZWwoQnJvYWRjYXN0Q2hhbm5lbElQQy5DSEFOTkVMX05BTUUpO1xyXG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwub25tZXNzYWdlID0gdGhpcy5vbl9tZXNzYWdlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbC5vbm1lc3NhZ2VlcnJvciA9IHRoaXMub25fZXJyb3IuYmluZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25fbWVzc2FnZShldmVudDogTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmKHR5cGVvZihldmVudC5kYXRhKSAhPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlY2VpdmVkIG1lc3NhZ2Ugd2l0aCBhbiBpbnZhbGlkIHR5cGUgKCVzKTogJW9cIiksIHR5cGVvZihldmVudC5kYXRhKSwgZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBCcm9hZGNhc3RNZXNzYWdlO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5JUEMsIHRyKFwiUmVjZWl2ZWQgYW4gaW52YWxpZCBlbmNvZGVkIG1lc3NhZ2U6ICVvXCIpLCBldmVudC5kYXRhKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzdXBlci5oYW5kbGVfbWVzc2FnZShtZXNzYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25fZXJyb3IoZXZlbnQ6IE1lc3NhZ2VFdmVudCkge1xyXG4gICAgICAgICAgICBsb2cud2FybihMb2dDYXRlZ29yeS5JUEMsIHRyKFwiUmVjZWl2ZWQgZXJyb3I6ICVvXCIpLCBldmVudCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZW5kX21lc3NhZ2UodHlwZTogc3RyaW5nLCBkYXRhOiBhbnksIHRhcmdldD86IHN0cmluZykge1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlOiBCcm9hZGNhc3RNZXNzYWdlID0ge30gYXMgYW55O1xyXG5cclxuICAgICAgICAgICAgbWVzc2FnZS5zZW5kZXIgPSB0aGlzLnVuaXF1ZV9pZDtcclxuICAgICAgICAgICAgbWVzc2FnZS5yZWNlaXZlciA9IHRhcmdldCA/IHRhcmdldCA6IEJhc2ljSVBDSGFuZGxlci5CUk9BRENBU1RfVU5JUVVFX0lEO1xyXG4gICAgICAgICAgICBtZXNzYWdlLnRpbWVzdGFtcCA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbmFtZXNwYWNlIGNvbm5lY3Qge1xyXG4gICAgICAgIGV4cG9ydCB0eXBlIENvbm5lY3RSZXF1ZXN0RGF0YSA9IHtcclxuICAgICAgICAgICAgYWRkcmVzczogc3RyaW5nO1xyXG5cclxuICAgICAgICAgICAgcHJvZmlsZT86IHN0cmluZztcclxuICAgICAgICAgICAgdXNlcm5hbWU/OiBzdHJpbmc7XHJcbiAgICAgICAgICAgIHBhc3N3b3JkPzoge1xyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHN0cmluZztcclxuICAgICAgICAgICAgICAgIGhhc2hlZDogYm9vbGVhbjtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdE9mZmVyIHtcclxuICAgICAgICAgICAgcmVxdWVzdF9pZDogc3RyaW5nO1xyXG4gICAgICAgICAgICBkYXRhOiBDb25uZWN0UmVxdWVzdERhdGE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnQgaW50ZXJmYWNlIENvbm5lY3RPZmZlckFuc3dlciB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RfaWQ6IHN0cmluZztcclxuICAgICAgICAgICAgYWNjZXB0ZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnQgaW50ZXJmYWNlIENvbm5lY3RFeGVjdXRlIHtcclxuICAgICAgICAgICAgcmVxdWVzdF9pZDogc3RyaW5nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0IGludGVyZmFjZSBDb25uZWN0RXhlY3V0ZWQge1xyXG4gICAgICAgICAgICByZXF1ZXN0X2lkOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIHN1Y2NlZWRlZDogYm9vbGVhbjtcclxuICAgICAgICAgICAgbWVzc2FnZT86IHN0cmluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIFRoZSBjb25uZWN0IHByb2Nlc3M6XHJcbiAgICAgICAgICogIDEuIEJyb2FkY2FzdCBhbiBvZmZlclxyXG4gICAgICAgICAqICAyLiBXYWl0IDUwbXMgZm9yIGFsbCBvZmZlciByZXNwb25zZXMgb3IgdW50aWwgdGhlIGZpcnN0IG9uZSByZXNwb25kIHdpdGggXCJva1wiXHJcbiAgICAgICAgICogIDMuIFNlbGVjdCAoaWYgcG9zc2libGUpIG9uIGFjY2VwdGVkIG9mZmVyIGFuZCBleGVjdXRlIHRoZSBjb25uZWN0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgZXhwb3J0IGNsYXNzIENvbm5lY3RIYW5kbGVyIHtcclxuICAgICAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgQ0hBTk5FTF9OQU1FID0gXCJjb25uZWN0XCI7XHJcblxyXG4gICAgICAgICAgICByZWFkb25seSBpcGNfaGFuZGxlcjogQmFzaWNJUENIYW5kbGVyO1xyXG4gICAgICAgICAgICBwcml2YXRlIGlwY19jaGFubmVsOiBDaGFubmVsO1xyXG5cclxuICAgICAgICAgICAgcHVibGljIGNhbGxiYWNrX2F2YWlsYWJsZTogKGRhdGE6IENvbm5lY3RSZXF1ZXN0RGF0YSkgPT4gYm9vbGVhbiA9ICgpID0+IGZhbHNlO1xyXG4gICAgICAgICAgICBwdWJsaWMgY2FsbGJhY2tfZXhlY3V0ZTogKGRhdGE6IENvbm5lY3RSZXF1ZXN0RGF0YSkgPT4gYm9vbGVhbiB8IHN0cmluZyA9ICgpID0+IGZhbHNlO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHByaXZhdGUgX3BlbmRpbmdfY29ubmVjdF9vZmZlcnM6IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiBDb25uZWN0UmVxdWVzdERhdGE7XHJcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiBudW1iZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVtb3RlX2hhbmRsZXI6IHN0cmluZztcclxuICAgICAgICAgICAgfVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBwcml2YXRlIF9wZW5kaW5nX2Nvbm5lY3RzX3JlcXVlc3RzOiB7XHJcbiAgICAgICAgICAgICAgICBpZDogc3RyaW5nO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGE6IENvbm5lY3RSZXF1ZXN0RGF0YTtcclxuICAgICAgICAgICAgICAgIHRpbWVvdXQ6IG51bWJlcjtcclxuXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja19zdWNjZXNzOiAoKSA9PiBhbnk7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja19mYWlsZWQ6IChtZXNzYWdlOiBzdHJpbmcpID0+IGFueTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrX2F2YWlsOiAoKSA9PiBQcm9taXNlPGJvb2xlYW4+O1xyXG5cclxuICAgICAgICAgICAgICAgIHJlbW90ZV9oYW5kbGVyPzogc3RyaW5nO1xyXG4gICAgICAgICAgICB9W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKGlwY19oYW5kbGVyOiBCYXNpY0lQQ0hhbmRsZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXBjX2hhbmRsZXIgPSBpcGNfaGFuZGxlcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHVibGljIHNldHVwKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pcGNfY2hhbm5lbCA9IHRoaXMuaXBjX2hhbmRsZXIuY3JlYXRlX2NoYW5uZWwodW5kZWZpbmVkLCBDb25uZWN0SGFuZGxlci5DSEFOTkVMX05BTUUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pcGNfY2hhbm5lbC5tZXNzYWdlX2hhbmRsZXIgPSB0aGlzLm9uX21lc3NhZ2UuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJpdmF0ZSBvbl9tZXNzYWdlKHNlbmRlcjogc3RyaW5nLCBicm9hZGNhc3Q6IGJvb2xlYW4sIG1lc3NhZ2U6IENoYW5uZWxNZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICBpZihicm9hZGNhc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihtZXNzYWdlLnR5cGUgPT0gXCJvZmZlclwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlLmRhdGEgYXMgQ29ubmVjdE9mZmVyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHRlZDogdGhpcy5jYWxsYmFja19hdmFpbGFibGUoZGF0YS5kYXRhKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RfaWQ6IGRhdGEucmVxdWVzdF9pZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGFzIENvbm5lY3RPZmZlckFuc3dlcjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJlc3BvbnNlLmFjY2VwdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlY2VpdmVkIG5ldyBjb25uZWN0IG9mZmVyIGZyb20gJXM6ICVzXCIpLCBzZW5kZXIsIGRhdGEucmVxdWVzdF9pZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3RlX2hhbmRsZXI6IHNlbmRlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IGRhdGEucmVxdWVzdF9pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ19jb25uZWN0X29mZmVycy5wdXNoKGxkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxkLnRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIkRyb3BwaW5nIGNvbm5lY3QgcmVxdWVzdCAlcywgYmVjYXVzZSB3ZSBuZXZlciByZWNlaXZlZCBhbiBleGVjdXRlLlwiKSwgbGQuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdfY29ubmVjdF9vZmZlcnMucmVtb3ZlKGxkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEyMCAqIDEwMDApIGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlwY19jaGFubmVsLnNlbmRfbWVzc2FnZShcIm9mZmVyLWFuc3dlclwiLCByZXNwb25zZSwgc2VuZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PSBcIm9mZmVyLWFuc3dlclwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlLmRhdGEgYXMgQ29ubmVjdE9mZmVyQW5zd2VyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5fcGVuZGluZ19jb25uZWN0c19yZXF1ZXN0cy5maW5kKGUgPT4gZS5pZCA9PT0gZGF0YS5yZXF1ZXN0X2lkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIXJlcXVlc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LklQQywgdHIoXCJSZWNlaXZlZCBjb25uZWN0IG9mZmVyIGFuc3dlciB3aXRoIHVua25vd24gcmVxdWVzdCBpZCAoJXMpLlwiKSwgZGF0YS5yZXF1ZXN0X2lkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZighZGF0YS5hY2NlcHRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKExvZ0NhdGVnb3J5LklQQywgdHIoXCJDbGllbnQgJXMgcmVqZWN0ZWQgdGhlIGNvbm5lY3Qgb2ZmZXIgKCVzKS5cIiksIHNlbmRlciwgcmVxdWVzdC5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmVxdWVzdC5yZW1vdGVfaGFuZGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKExvZ0NhdGVnb3J5LklQQywgdHIoXCJDbGllbnQgJXMgYWNjZXB0ZWQgdGhlIGNvbm5lY3Qgb2ZmZXIgKCVzKSwgYnV0IG9mZmVyIGhhcyBhbHJlYWR5IGJlZW4gYWNjZXB0ZWQuXCIpLCBzZW5kZXIsIHJlcXVlc3QuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIkNsaWVudCAlcyBhY2NlcHRlZCB0aGUgY29ubmVjdCBvZmZlciAoJXMpLiBSZXF1ZXN0IGxvY2FsIGFjY2VwdGFuY2UuXCIpLCBzZW5kZXIsIHJlcXVlc3QuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnJlbW90ZV9oYW5kbGVyID0gc2VuZGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuY2FsbGJhY2tfYXZhaWwoKS50aGVuKGZsYWcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWZsYWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmNhbGxiYWNrX2ZhaWxlZChcImxvY2FsIGF2YWlsIHJlamVjdGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIkV4ZWN1dGluZyBjb25uZWN0IHdpdGggY2xpZW50ICVzXCIpLCByZXF1ZXN0LnJlbW90ZV9oYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXBjX2NoYW5uZWwuc2VuZF9tZXNzYWdlKFwiZXhlY3V0ZVwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF9pZDogcmVxdWVzdC5pZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBhcyBDb25uZWN0RXhlY3V0ZSwgcmVxdWVzdC5yZW1vdGVfaGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmNhbGxiYWNrX2ZhaWxlZChcImNvbm5lY3QgZXhlY3V0ZSB0aW1lb3V0XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCkgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIkxvY2FsIGF2YWlsIGNhbGxiYWNrIGNhdXNlZCBhbiBlcnJvcjogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuY2FsbGJhY2tfZmFpbGVkKHRyKFwibG9jYWwgYXZhaWwgY2FsbGJhY2sgY2F1c2VkIGFuIGVycm9yXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKG1lc3NhZ2UudHlwZSA9PSBcImV4ZWN1dGVkXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2UuZGF0YSBhcyBDb25uZWN0RXhlY3V0ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLl9wZW5kaW5nX2Nvbm5lY3RzX3JlcXVlc3RzLmZpbmQoZSA9PiBlLmlkID09PSBkYXRhLnJlcXVlc3RfaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZighcmVxdWVzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlY2VpdmVkIGNvbm5lY3QgZXhlY3V0ZWQgd2l0aCB1bmtub3duIHJlcXVlc3QgaWQgKCVzKS5cIiksIGRhdGEucmVxdWVzdF9pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJlcXVlc3QucmVtb3RlX2hhbmRsZXIgIT0gc2VuZGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cud2FybihMb2dDYXRlZ29yeS5JUEMsIHRyKFwiUmVjZWl2ZWQgY29ubmVjdCBleGVjdXRlZCBmb3IgcmVxdWVzdCAlcywgYnV0IGZyb20gd3JvbmcgY2xpZW50OiAlcyAoZXhwZWN0ZWQgJXMpXCIpLCBkYXRhLnJlcXVlc3RfaWQsIHNlbmRlciwgcmVxdWVzdC5yZW1vdGVfaGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhMb2dDYXRlZ29yeS5JUEMsIHRyKFwiUmVjZWl2ZWQgY29ubmVjdCBleGVjdXRlZCByZXNwb25zZSBmcm9tIGNsaWVudCAlcyBmb3IgcmVxdWVzdCAlcy4gU3VjY2VlZGVkOiAlbyAoJXMpXCIpLCBzZW5kZXIsIGRhdGEucmVxdWVzdF9pZCwgZGF0YS5zdWNjZWVkZWQsIGRhdGEubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVvdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihkYXRhLnN1Y2NlZWRlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuY2FsbGJhY2tfc3VjY2VzcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmNhbGxiYWNrX2ZhaWxlZChkYXRhLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKG1lc3NhZ2UudHlwZSA9PSBcImV4ZWN1dGVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbWVzc2FnZS5kYXRhIGFzIENvbm5lY3RFeGVjdXRlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5fcGVuZGluZ19jb25uZWN0X29mZmVycy5maW5kKGUgPT4gZS5pZCA9PT0gZGF0YS5yZXF1ZXN0X2lkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIXJlcXVlc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LklQQywgdHIoXCJSZWNlaXZlZCBjb25uZWN0IGV4ZWN1dGUgd2l0aCB1bmtub3duIHJlcXVlc3QgaWQgKCVzKS5cIiksIGRhdGEucmVxdWVzdF9pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJlcXVlc3QucmVtb3RlX2hhbmRsZXIgIT0gc2VuZGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cud2FybihMb2dDYXRlZ29yeS5JUEMsIHRyKFwiUmVjZWl2ZWQgY29ubmVjdCBleGVjdXRlIGZvciByZXF1ZXN0ICVzLCBidXQgZnJvbSB3cm9uZyBjbGllbnQ6ICVzIChleHBlY3RlZCAlcylcIiksIGRhdGEucmVxdWVzdF9pZCwgc2VuZGVyLCByZXF1ZXN0LnJlbW90ZV9oYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lb3V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ19jb25uZWN0X29mZmVycy5yZW1vdmUocmVxdWVzdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIkV4ZWN1dGluZyBjb25uZWN0IGZvciAlc1wiKSwgZGF0YS5yZXF1ZXN0X2lkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3IgPSB0aGlzLmNhbGxiYWNrX2V4ZWN1dGUocmVxdWVzdC5kYXRhKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF9pZDogZGF0YS5yZXF1ZXN0X2lkLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2NlZWRlZDogdHlwZW9mKGNyKSAhPT0gXCJzdHJpbmdcIiAmJiBjcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHR5cGVvZihjcikgPT09IFwic3RyaW5nXCIgPyBjciA6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gYXMgQ29ubmVjdEV4ZWN1dGVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlwY19jaGFubmVsLnNlbmRfbWVzc2FnZShcImV4ZWN1dGVkXCIsIHJlc3BvbnNlLCByZXF1ZXN0LnJlbW90ZV9oYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHBvc3RfY29ubmVjdF9yZXF1ZXN0KGRhdGE6IENvbm5lY3RSZXF1ZXN0RGF0YSwgY2FsbGJhY2tfYXZhaWw6ICgpID0+IFByb21pc2U8Ym9vbGVhbj4pIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBkID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogdXVpZHY0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IDAsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja19zdWNjZXNzOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nX2Nvbm5lY3RzX3JlcXVlc3RzLnJlbW92ZShwZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQocGQudGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja19mYWlsZWQ6IGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdfY29ubmVjdHNfcmVxdWVzdHMucmVtb3ZlKHBkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChwZC50aW1lb3V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja19hdmFpbDogY2FsbGJhY2tfYXZhaWwsXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nX2Nvbm5lY3RzX3JlcXVlc3RzLnB1c2gocGQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlwY19jaGFubmVsLnNlbmRfbWVzc2FnZShcIm9mZmVyXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF9pZDogcGQuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHBkLmRhdGFcclxuICAgICAgICAgICAgICAgICAgICB9IGFzIENvbm5lY3RPZmZlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcGQudGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwZC5jYWxsYmFja19mYWlsZWQoXCJyZWNlaXZlZCBubyByZXNwb25zZSB0byBvZmZlclwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCA1MCkgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbmFtZXNwYWNlIG1wcm94eSB7XHJcbiAgICAgICAgZXhwb3J0IGludGVyZmFjZSBNZXRob2RQcm94eUludm9rZURhdGEge1xyXG4gICAgICAgICAgICBtZXRob2RfbmFtZTogc3RyaW5nO1xyXG4gICAgICAgICAgICBhcmd1bWVudHM6IGFueVtdO1xyXG4gICAgICAgICAgICBwcm9taXNlX2lkOiBzdHJpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kUHJveHlSZXN1bHREYXRhIHtcclxuICAgICAgICAgICAgcHJvbWlzZV9pZDogc3RyaW5nO1xyXG4gICAgICAgICAgICByZXN1bHQ6IGFueTtcclxuICAgICAgICAgICAgc3VjY2VzczogYm9vbGVhbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZXhwb3J0IGludGVyZmFjZSBNZXRob2RQcm94eUNhbGxiYWNrIHtcclxuICAgICAgICAgICAgcHJvbWlzZTogUHJvbWlzZTxhbnk+O1xyXG4gICAgICAgICAgICBwcm9taXNlX2lkOiBzdHJpbmc7XHJcblxyXG4gICAgICAgICAgICByZXNvbHZlOiAob2JqZWN0OiBhbnkpID0+IGFueTtcclxuICAgICAgICAgICAgcmVqZWN0OiAob2JqZWN0OiBhbnkpID0+IGFueTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydCB0eXBlIE1ldGhvZFByb3h5Q29ubmVjdFBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgIGNoYW5uZWxfaWQ6IHN0cmluZztcclxuICAgICAgICAgICAgY2xpZW50X2lkOiBzdHJpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNZXRob2RQcm94eSB7XHJcbiAgICAgICAgICAgIHJlYWRvbmx5IGlwY19oYW5kbGVyOiBCYXNpY0lQQ0hhbmRsZXI7XHJcbiAgICAgICAgICAgIHByaXZhdGUgX2lwY19jaGFubmVsOiBDaGFubmVsO1xyXG4gICAgICAgICAgICBwcml2YXRlIF9pcGNfcGFyYW1ldGVyczogTWV0aG9kUHJveHlDb25uZWN0UGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgIHByaXZhdGUgcmVhZG9ubHkgX2xvY2FsOiBib29sZWFuO1xyXG4gICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IF9zbGF2ZTogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgICAgIHByaXZhdGUgX2Nvbm5lY3RlZDogYm9vbGVhbjtcclxuICAgICAgICAgICAgcHJpdmF0ZSBfcHJveGllZF9tZXRob2RzOiB7W2tleTogc3RyaW5nXTooKSA9PiBQcm9taXNlPGFueT59ID0ge307XHJcbiAgICAgICAgICAgIHByaXZhdGUgX3Byb3hpZWRfY2FsbGJhY2tzOiB7W2tleTogc3RyaW5nXTpNZXRob2RQcm94eUNhbGxiYWNrfSA9IHt9O1xyXG5cclxuICAgICAgICAgICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKGlwY19oYW5kbGVyOiBCYXNpY0lQQ0hhbmRsZXIsIGNvbm5lY3RfcGFyYW1zPzogTWV0aG9kUHJveHlDb25uZWN0UGFyYW1ldGVycykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pcGNfaGFuZGxlciA9IGlwY19oYW5kbGVyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5faXBjX3BhcmFtZXRlcnMgPSBjb25uZWN0X3BhcmFtcztcclxuICAgICAgICAgICAgICAgIHRoaXMuX2Nvbm5lY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2xhdmUgPSB0eXBlb2YoY29ubmVjdF9wYXJhbXMpICE9PSBcInVuZGVmaW5lZFwiO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbG9jYWwgPSB0eXBlb2YoY29ubmVjdF9wYXJhbXMpICE9PSBcInVuZGVmaW5lZFwiICYmIGNvbm5lY3RfcGFyYW1zLmNoYW5uZWxfaWQgPT09IFwibG9jYWxcIiAmJiBjb25uZWN0X3BhcmFtcy5jbGllbnRfaWQgPT09IFwibG9jYWxcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJvdGVjdGVkIHNldHVwKCkge1xyXG4gICAgICAgICAgICAgICAgaWYodGhpcy5fbG9jYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25fY29ubmVjdGVkKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuX3NsYXZlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9pcGNfY2hhbm5lbCA9IHRoaXMuaXBjX2hhbmRsZXIuY3JlYXRlX2NoYW5uZWwodGhpcy5faXBjX3BhcmFtZXRlcnMuY2xpZW50X2lkLCB0aGlzLl9pcGNfcGFyYW1ldGVycy5jaGFubmVsX2lkKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2lwY19jaGFubmVsID0gdGhpcy5pcGNfaGFuZGxlci5jcmVhdGVfY2hhbm5lbCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pcGNfY2hhbm5lbC5tZXNzYWdlX2hhbmRsZXIgPSB0aGlzLl9oYW5kbGVfbWVzc2FnZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuX3NsYXZlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9pcGNfY2hhbm5lbC5zZW5kX21lc3NhZ2UoXCJpbml0aWFsaXplXCIsIHt9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJvdGVjdGVkIGZpbmFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgaWYoIXRoaXMuX2xvY2FsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodGhpcy5fY29ubmVjdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9pcGNfY2hhbm5lbC5zZW5kX21lc3NhZ2UoXCJmaW5hbGl6ZVwiLCB7fSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXBjX2hhbmRsZXIuZGVsZXRlX2NoYW5uZWwodGhpcy5faXBjX2NoYW5uZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2lwY19jaGFubmVsID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZm9yKGNvbnN0IHByb21pc2Ugb2YgT2JqZWN0LnZhbHVlcyh0aGlzLl9wcm94aWVkX2NhbGxiYWNrcykpXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5yZWplY3QoXCJkaXNjb25uZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm94aWVkX2NhbGxiYWNrcyA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuX2Nvbm5lY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbl9kaXNjb25uZWN0ZWQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJvdGVjdGVkIHJlZ2lzdGVyX21ldGhvZDxSPihtZXRob2Q6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxSPiB8IHN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgbGV0IG1ldGhvZF9uYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbWV0aG9kID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlZ2lzdGVyaW5nIG1ldGhvZCBwcm94eSBmb3IgJXNcIiksIG1ldGhvZC5uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2RfbmFtZSA9IG1ldGhvZC5uYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoTG9nQ2F0ZWdvcnkuSVBDLCB0cihcIlJlZ2lzdGVyaW5nIG1ldGhvZCBwcm94eSBmb3IgJXNcIiksIG1ldGhvZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kX25hbWUgPSBtZXRob2Q7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoIXRoaXNbbWV0aG9kX25hbWVdKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwibWV0aG9kIGlzIG1pc3NpbmcgaW4gY3VycmVudCBvYmplY3RcIjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm94aWVkX21ldGhvZHNbbWV0aG9kX25hbWVdID0gdGhpc1ttZXRob2RfbmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZighdGhpcy5fbG9jYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzW21ldGhvZF9uYW1lXSA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZighdGhpcy5fY29ubmVjdGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwibm90IGNvbm5lY3RlZFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3h5X2NhbGxiYWNrID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZV9pZDogdXVpZHY0KClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBhcyBNZXRob2RQcm94eUNhbGxiYWNrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcm94aWVkX2NhbGxiYWNrc1twcm94eV9jYWxsYmFjay5wcm9taXNlX2lkXSA9IHByb3h5X2NhbGxiYWNrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm94eV9jYWxsYmFjay5wcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJveHlfY2FsbGJhY2sucmVzb2x2ZSA9IHJlc29sdmU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eV9jYWxsYmFjay5yZWplY3QgPSByZWplY3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faXBjX2NoYW5uZWwuc2VuZF9tZXNzYWdlKFwiaW52b2tlXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VfaWQ6IHByb3h5X2NhbGxiYWNrLnByb21pc2VfaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFsuLi5hcmdzXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZF9uYW1lOiBtZXRob2RfbmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGFzIE1ldGhvZFByb3h5SW52b2tlRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm94eV9jYWxsYmFjay5wcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJpdmF0ZSBfaGFuZGxlX21lc3NhZ2UocmVtb3RlX2lkOiBzdHJpbmcsIGJvcmFkY2FzdDogYm9vbGVhbiwgbWVzc2FnZTogQ2hhbm5lbE1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgIGlmKG1lc3NhZ2UudHlwZSA9PT0gXCJmaW5hbGl6ZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlX2ZpbmFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYobWVzc2FnZS50eXBlID09PSBcImluaXRpYWxpemVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZV9yZW1vdGVfY2FsbGJhY2socmVtb3RlX2lkKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihtZXNzYWdlLnR5cGUgPT09IFwiaW52b2tlXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVfaW52b2tlKG1lc3NhZ2UuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYobWVzc2FnZS50eXBlID09PSBcInJlc3VsdFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlX3Jlc3VsdChtZXNzYWdlLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwcml2YXRlIF9oYW5kbGVfZmluYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uX2Rpc2Nvbm5lY3RlZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5maW5hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fY29ubmVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHByaXZhdGUgX2hhbmRsZV9yZW1vdGVfY2FsbGJhY2socmVtb3RlX2lkOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgIGlmKCF0aGlzLl9pcGNfY2hhbm5lbC50YXJnZXRfaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZih0aGlzLl9zbGF2ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJpbml0aWFsaXplIHdyb25nIHN0YXRlIVwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pcGNfY2hhbm5lbC50YXJnZXRfaWQgPSByZW1vdGVfaWQ7IC8qIG5vdyB3ZSdyZSBhYmxlIHRvIHNlbmQgbWVzc2FnZXMgKi9cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uX2Nvbm5lY3RlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2lwY19jaGFubmVsLnNlbmRfbWVzc2FnZShcImluaXRpYWxpemVcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCF0aGlzLl9zbGF2ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJpbml0aWFsaXplIHdyb25nIHN0YXRlIVwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uX2Nvbm5lY3RlZCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJpdmF0ZSBfc2VuZF9yZXN1bHQocHJvbWlzZV9pZDogc3RyaW5nLCBzdWNjZXNzOiBib29sZWFuLCBtZXNzYWdlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2lwY19jaGFubmVsLnNlbmRfbWVzc2FnZShcInJlc3VsdFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZV9pZDogcHJvbWlzZV9pZCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IG1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2Vzc1xyXG4gICAgICAgICAgICAgICAgfSBhcyBNZXRob2RQcm94eVJlc3VsdERhdGEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwcml2YXRlIF9oYW5kbGVfaW52b2tlKGRhdGE6IE1ldGhvZFByb3h5SW52b2tlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYodGhpcy5fcHJveGllZF9tZXRob2RzW2RhdGEubWV0aG9kX25hbWVdKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwid2UgY291bGQgbm90IGludm9rZSBhIGxvY2FsIHByb3hpZWQgbWV0aG9kIVwiO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKCF0aGlzW2RhdGEubWV0aG9kX25hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2VuZF9yZXN1bHQoZGF0YS5wcm9taXNlX2lkLCBmYWxzZSwgXCJtaXNzaW5nIG1ldGhvZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhMb2dDYXRlZ29yeS5JUEMsIHRyKFwiSW52b2tpbmcgbWV0aG9kICVzIHdpdGggYXJndW1lbnRzOiAlb1wiKSwgZGF0YS5tZXRob2RfbmFtZSwgZGF0YS5hcmd1bWVudHMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gdGhpc1tkYXRhLm1ldGhvZF9uYW1lXSguLi5kYXRhLmFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS50aGVuKHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKExvZ0NhdGVnb3J5LklQQywgdHIoXCJSZXN1bHQ6ICVvXCIpLCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZW5kX3Jlc3VsdChkYXRhLnByb21pc2VfaWQsIHRydWUsIHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZW5kX3Jlc3VsdChkYXRhLnByb21pc2VfaWQsIGZhbHNlLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2VuZF9yZXN1bHQoZGF0YS5wcm9taXNlX2lkLCBmYWxzZSwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcHJpdmF0ZSBfaGFuZGxlX3Jlc3VsdChkYXRhOiBNZXRob2RQcm94eVJlc3VsdERhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmKCF0aGlzLl9wcm94aWVkX2NhbGxiYWNrc1tkYXRhLnByb21pc2VfaWRdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHRyKFwiUmVjZWl2ZWQgcHJveHkgbWV0aG9kIHJlc3VsdCBmb3IgdW5rbm93biBwcm9taXNlXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMuX3Byb3hpZWRfY2FsbGJhY2tzW2RhdGEucHJvbWlzZV9pZF07XHJcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fcHJveGllZF9jYWxsYmFja3NbZGF0YS5wcm9taXNlX2lkXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihkYXRhLnN1Y2Nlc3MpXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sucmVzb2x2ZShkYXRhLnJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sucmVqZWN0KGRhdGEucmVzdWx0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZ2VuZXJhdGVfY29ubmVjdF9wYXJhbWV0ZXJzKCkgOiBNZXRob2RQcm94eUNvbm5lY3RQYXJhbWV0ZXJzIHtcclxuICAgICAgICAgICAgICAgIGlmKHRoaXMuX3NsYXZlKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwib25seSBtYXN0ZXJzIGNhbiBnZW5lcmF0ZSBjb25uZWN0IHBhcmFtZXRlcnMhXCI7XHJcbiAgICAgICAgICAgICAgICBpZighdGhpcy5faXBjX2NoYW5uZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJwbGVhc2UgY2FsbCBzZXR1cCgpIGJlZm9yZVwiO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbF9pZDogdGhpcy5faXBjX2NoYW5uZWwuY2hhbm5lbF9pZCxcclxuICAgICAgICAgICAgICAgICAgICBjbGllbnRfaWQ6IHRoaXMuaXBjX2hhbmRsZXIuZ2V0X2xvY2FsX2FkZHJlc3MoKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaXNfc2xhdmUoKSB7IHJldHVybiB0aGlzLl9sb2NhbCB8fCB0aGlzLl9zbGF2ZTsgfSAvKiB0aGUgcG9wb3V0IG1vZGFsICovXHJcbiAgICAgICAgICAgIGlzX21hc3RlcigpIHsgcmV0dXJuIHRoaXMuX2xvY2FsIHx8ICF0aGlzLl9zbGF2ZTsgfSAvKiB0aGUgaG9zdCAodGVhd2ViIGFwcGxpY2F0aW9uKSAqL1xyXG5cclxuICAgICAgICAgICAgcHJvdGVjdGVkIGFic3RyYWN0IG9uX2Nvbm5lY3RlZCgpO1xyXG4gICAgICAgICAgICBwcm90ZWN0ZWQgYWJzdHJhY3Qgb25fZGlzY29ubmVjdGVkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCBoYW5kbGVyOiBCYXNpY0lQQ0hhbmRsZXI7XHJcbiAgICBsZXQgY29ubmVjdF9oYW5kbGVyOiBjb25uZWN0LkNvbm5lY3RIYW5kbGVyO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXR1cCgpIHtcclxuICAgICAgICBpZighc3VwcG9ydGVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgaGFuZGxlciA9IG5ldyBCcm9hZGNhc3RDaGFubmVsSVBDKCk7XHJcbiAgICAgICAgaGFuZGxlci5zZXR1cCgpO1xyXG5cclxuICAgICAgICBjb25uZWN0X2hhbmRsZXIgPSBuZXcgY29ubmVjdC5Db25uZWN0SGFuZGxlcihoYW5kbGVyKTtcclxuICAgICAgICBjb25uZWN0X2hhbmRsZXIuc2V0dXAoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0X2hhbmRsZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldF9jb25uZWN0X2hhbmRsZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbm5lY3RfaGFuZGxlcjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3VwcG9ydGVkKCkge1xyXG4gICAgICAgIC8qIGlvcyBkb2VzIG5vdCBzdXBwb3J0IHRoaXMgKi9cclxuICAgICAgICByZXR1cm4gdHlwZW9mKHdpbmRvdy5Ccm9hZGNhc3RDaGFubmVsKSAhPT0gXCJ1bmRlZmluZWRcIjtcclxuICAgIH1cclxufSIsImV4cG9ydCBlbnVtIEtleUNvZGUge1xyXG4gICAgS0VZX0NBTkNFTCA9IDMsXHJcbiAgICBLRVlfSEVMUCA9IDYsXHJcbiAgICBLRVlfQkFDS19TUEFDRSA9IDgsXHJcbiAgICBLRVlfVEFCID0gOSxcclxuICAgIEtFWV9DTEVBUiA9IDEyLFxyXG4gICAgS0VZX1JFVFVSTiA9IDEzLFxyXG4gICAgS0VZX0VOVEVSID0gMTQsXHJcbiAgICBLRVlfU0hJRlQgPSAxNixcclxuICAgIEtFWV9DT05UUk9MID0gMTcsXHJcbiAgICBLRVlfQUxUID0gMTgsXHJcbiAgICBLRVlfUEFVU0UgPSAxOSxcclxuICAgIEtFWV9DQVBTX0xPQ0sgPSAyMCxcclxuICAgIEtFWV9FU0NBUEUgPSAyNyxcclxuICAgIEtFWV9TUEFDRSA9IDMyLFxyXG4gICAgS0VZX1BBR0VfVVAgPSAzMyxcclxuICAgIEtFWV9QQUdFX0RPV04gPSAzNCxcclxuICAgIEtFWV9FTkQgPSAzNSxcclxuICAgIEtFWV9IT01FID0gMzYsXHJcbiAgICBLRVlfTEVGVCA9IDM3LFxyXG4gICAgS0VZX1VQID0gMzgsXHJcbiAgICBLRVlfUklHSFQgPSAzOSxcclxuICAgIEtFWV9ET1dOID0gNDAsXHJcbiAgICBLRVlfUFJJTlRTQ1JFRU4gPSA0NCxcclxuICAgIEtFWV9JTlNFUlQgPSA0NSxcclxuICAgIEtFWV9ERUxFVEUgPSA0NixcclxuICAgIEtFWV8wID0gNDgsXHJcbiAgICBLRVlfMSA9IDQ5LFxyXG4gICAgS0VZXzIgPSA1MCxcclxuICAgIEtFWV8zID0gNTEsXHJcbiAgICBLRVlfNCA9IDUyLFxyXG4gICAgS0VZXzUgPSA1MyxcclxuICAgIEtFWV82ID0gNTQsXHJcbiAgICBLRVlfNyA9IDU1LFxyXG4gICAgS0VZXzggPSA1NixcclxuICAgIEtFWV85ID0gNTcsXHJcbiAgICBLRVlfU0VNSUNPTE9OID0gNTksXHJcbiAgICBLRVlfRVFVQUxTID0gNjEsXHJcbiAgICBLRVlfQSA9IDY1LFxyXG4gICAgS0VZX0IgPSA2NixcclxuICAgIEtFWV9DID0gNjcsXHJcbiAgICBLRVlfRCA9IDY4LFxyXG4gICAgS0VZX0UgPSA2OSxcclxuICAgIEtFWV9GID0gNzAsXHJcbiAgICBLRVlfRyA9IDcxLFxyXG4gICAgS0VZX0ggPSA3MixcclxuICAgIEtFWV9JID0gNzMsXHJcbiAgICBLRVlfSiA9IDc0LFxyXG4gICAgS0VZX0sgPSA3NSxcclxuICAgIEtFWV9MID0gNzYsXHJcbiAgICBLRVlfTSA9IDc3LFxyXG4gICAgS0VZX04gPSA3OCxcclxuICAgIEtFWV9PID0gNzksXHJcbiAgICBLRVlfUCA9IDgwLFxyXG4gICAgS0VZX1EgPSA4MSxcclxuICAgIEtFWV9SID0gODIsXHJcbiAgICBLRVlfUyA9IDgzLFxyXG4gICAgS0VZX1QgPSA4NCxcclxuICAgIEtFWV9VID0gODUsXHJcbiAgICBLRVlfViA9IDg2LFxyXG4gICAgS0VZX1cgPSA4NyxcclxuICAgIEtFWV9YID0gODgsXHJcbiAgICBLRVlfWSA9IDg5LFxyXG4gICAgS0VZX1ogPSA5MCxcclxuICAgIEtFWV9MRUZUX0NNRCA9IDkxLFxyXG4gICAgS0VZX1JJR0hUX0NNRCA9IDkzLFxyXG4gICAgS0VZX0NPTlRFWFRfTUVOVSA9IDkzLFxyXG4gICAgS0VZX05VTVBBRDAgPSA5NixcclxuICAgIEtFWV9OVU1QQUQxID0gOTcsXHJcbiAgICBLRVlfTlVNUEFEMiA9IDk4LFxyXG4gICAgS0VZX05VTVBBRDMgPSA5OSxcclxuICAgIEtFWV9OVU1QQUQ0ID0gMTAwLFxyXG4gICAgS0VZX05VTVBBRDUgPSAxMDEsXHJcbiAgICBLRVlfTlVNUEFENiA9IDEwMixcclxuICAgIEtFWV9OVU1QQUQ3ID0gMTAzLFxyXG4gICAgS0VZX05VTVBBRDggPSAxMDQsXHJcbiAgICBLRVlfTlVNUEFEOSA9IDEwNSxcclxuICAgIEtFWV9NVUxUSVBMWSA9IDEwNixcclxuICAgIEtFWV9BREQgPSAxMDcsXHJcbiAgICBLRVlfU0VQQVJBVE9SID0gMTA4LFxyXG4gICAgS0VZX1NVQlRSQUNUID0gMTA5LFxyXG4gICAgS0VZX0RFQ0lNQUwgPSAxMTAsXHJcbiAgICBLRVlfRElWSURFID0gMTExLFxyXG4gICAgS0VZX0YxID0gMTEyLFxyXG4gICAgS0VZX0YyID0gMTEzLFxyXG4gICAgS0VZX0YzID0gMTE0LFxyXG4gICAgS0VZX0Y0ID0gMTE1LFxyXG4gICAgS0VZX0Y1ID0gMTE2LFxyXG4gICAgS0VZX0Y2ID0gMTE3LFxyXG4gICAgS0VZX0Y3ID0gMTE4LFxyXG4gICAgS0VZX0Y4ID0gMTE5LFxyXG4gICAgS0VZX0Y5ID0gMTIwLFxyXG4gICAgS0VZX0YxMCA9IDEyMSxcclxuICAgIEtFWV9GMTEgPSAxMjIsXHJcbiAgICBLRVlfRjEyID0gMTIzLFxyXG4gICAgS0VZX0YxMyA9IDEyNCxcclxuICAgIEtFWV9GMTQgPSAxMjUsXHJcbiAgICBLRVlfRjE1ID0gMTI2LFxyXG4gICAgS0VZX0YxNiA9IDEyNyxcclxuICAgIEtFWV9GMTcgPSAxMjgsXHJcbiAgICBLRVlfRjE4ID0gMTI5LFxyXG4gICAgS0VZX0YxOSA9IDEzMCxcclxuICAgIEtFWV9GMjAgPSAxMzEsXHJcbiAgICBLRVlfRjIxID0gMTMyLFxyXG4gICAgS0VZX0YyMiA9IDEzMyxcclxuICAgIEtFWV9GMjMgPSAxMzQsXHJcbiAgICBLRVlfRjI0ID0gMTM1LFxyXG4gICAgS0VZX05VTV9MT0NLID0gMTQ0LFxyXG4gICAgS0VZX1NDUk9MTF9MT0NLID0gMTQ1LFxyXG4gICAgS0VZX0NPTU1BID0gMTg4LFxyXG4gICAgS0VZX1BFUklPRCA9IDE5MCxcclxuICAgIEtFWV9TTEFTSCA9IDE5MSxcclxuICAgIEtFWV9CQUNLX1FVT1RFID0gMTkyLFxyXG4gICAgS0VZX09QRU5fQlJBQ0tFVCA9IDIxOSxcclxuICAgIEtFWV9CQUNLX1NMQVNIID0gMjIwLFxyXG4gICAgS0VZX0NMT1NFX0JSQUNLRVQgPSAyMjEsXHJcbiAgICBLRVlfUVVPVEUgPSAyMjIsXHJcbiAgICBLRVlfTUVUQSA9IDIyNFxyXG59XHJcblxyXG5leHBvcnQgbmFtZXNwYWNlIHBwdCB7XHJcbiAgICBleHBvcnQgZW51bSBFdmVudFR5cGUge1xyXG4gICAgICAgIEtFWV9QUkVTUyxcclxuICAgICAgICBLRVlfUkVMRUFTRSxcclxuICAgICAgICBLRVlfVFlQRURcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBTcGVjaWFsS2V5IHtcclxuICAgICAgICBDVFJMLFxyXG4gICAgICAgIFdJTkRPV1MsXHJcbiAgICAgICAgU0hJRlQsXHJcbiAgICAgICAgQUxUXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBLZXlEZXNjcmlwdG9yIHtcclxuICAgICAgICBrZXlfY29kZTogc3RyaW5nO1xyXG5cclxuICAgICAgICBrZXlfY3RybDogYm9vbGVhbjtcclxuICAgICAgICBrZXlfd2luZG93czogYm9vbGVhbjtcclxuICAgICAgICBrZXlfc2hpZnQ6IGJvb2xlYW47XHJcbiAgICAgICAga2V5X2FsdDogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIEtleUV2ZW50IGV4dGVuZHMgS2V5RGVzY3JpcHRvciB7XHJcbiAgICAgICAgcmVhZG9ubHkgdHlwZTogRXZlbnRUeXBlO1xyXG5cclxuICAgICAgICByZWFkb25seSBrZXk6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIEtleUhvb2sgZXh0ZW5kcyBLZXlEZXNjcmlwdG9yIHtcclxuICAgICAgICBjYW5jZWw6IGJvb2xlYW47XHJcblxyXG5cclxuICAgICAgICBjYWxsYmFja19wcmVzczogKCkgPT4gYW55O1xyXG4gICAgICAgIGNhbGxiYWNrX3JlbGVhc2U6ICgpID0+IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24ga2V5X2Rlc2NyaXB0aW9uKGtleTogS2V5RGVzY3JpcHRvcikge1xyXG4gICAgICAgIGxldCByZXN1bHQgPSBcIlwiO1xyXG4gICAgICAgIGlmKGtleS5rZXlfc2hpZnQpXHJcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIiArIFwiICsgdHIoXCJTaGlmdFwiKTtcclxuICAgICAgICBpZihrZXkua2V5X2FsdClcclxuICAgICAgICAgICAgcmVzdWx0ICs9IFwiICsgXCIgKyB0cihcIkFsdFwiKTtcclxuICAgICAgICBpZihrZXkua2V5X2N0cmwpXHJcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIiArIFwiICsgdHIoXCJDVFJMXCIpO1xyXG4gICAgICAgIGlmKGtleS5rZXlfd2luZG93cylcclxuICAgICAgICAgICAgcmVzdWx0ICs9IFwiICsgXCIgKyB0cihcIldpblwiKTtcclxuXHJcbiAgICAgICAgaWYoIXJlc3VsdCAmJiAha2V5LmtleV9jb2RlKVxyXG4gICAgICAgICAgICByZXR1cm4gdHIoXCJ1bnNldFwiKTtcclxuXHJcbiAgICAgICAgaWYoa2V5LmtleV9jb2RlKVxyXG4gICAgICAgICAgICByZXN1bHQgKz0gXCIgKyBcIiArIGtleS5rZXlfY29kZTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0LnN1YnN0cigzKTtcclxuICAgIH1cclxufSIsImltcG9ydCB7XHJcbiAgICBDbGllbnROYW1lSW5mbyxcclxuICAgIENvbW1hbmRSZXN1bHQsXHJcbiAgICBFcnJvcklELFxyXG4gICAgUGxheWxpc3QsIFBsYXlsaXN0SW5mbywgUGxheWxpc3RTb25nLFxyXG4gICAgUXVlcnlMaXN0LFxyXG4gICAgUXVlcnlMaXN0RW50cnksIFNlcnZlckdyb3VwQ2xpZW50XHJcbn0gZnJvbSBcIi4vU2VydmVyQ29ubmVjdGlvbkRlY2xhcmF0aW9uXCI7XHJcbmltcG9ydCB7Q2hhbm5lbEVudHJ5fSBmcm9tIFwiLi4vY2hhbm5lbC10cmVlL2NoYW5uZWxcIjtcclxuaW1wb3J0IHtDaGF0VHlwZX0gZnJvbSBcIi4uL3VpL2ZyYW1lcy9jaGF0XCI7XHJcbmltcG9ydCB7Q2xpZW50RW50cnl9IGZyb20gXCIuLi9jaGFubmVsLXRyZWUvY2xpZW50XCI7XHJcbmltcG9ydCB7QWJzdHJhY3RDb21tYW5kSGFuZGxlciwgU2VydmVyQ29tbWFuZCwgU2luZ2xlQ29tbWFuZEhhbmRsZXJ9IGZyb20gXCIuL0Nvbm5lY3Rpb25CYXNlXCI7XHJcbmltcG9ydCB7bG9nLCBMb2dDYXRlZ29yeX0gZnJvbSBcIi4uL2xvZ1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbW1hbmRIZWxwZXIgZXh0ZW5kcyBBYnN0cmFjdENvbW1hbmRIYW5kbGVyIHtcclxuICAgIHByaXZhdGUgX3dob19hbV9pOiBhbnk7XHJcbiAgICBwcml2YXRlIF9hd2FpdGVyc191bmlxdWVfaWRzOiB7W3VuaXF1ZV9pZDogc3RyaW5nXTooKHJlc29sdmVkOiBDbGllbnROYW1lSW5mbykgPT4gYW55KVtdfSA9IHt9O1xyXG4gICAgcHJpdmF0ZSBfYXdhaXRlcnNfdW5pcXVlX2RiaWQ6IHtbZGF0YWJhc2VfaWQ6IG51bWJlcl06KChyZXNvbHZlZDogQ2xpZW50TmFtZUluZm8pID0+IGFueSlbXX0gPSB7fTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uZWN0aW9uKSB7XHJcbiAgICAgICAgc3VwZXIoY29ubmVjdGlvbik7XHJcblxyXG4gICAgICAgIHRoaXMudm9sYXRpbGVfaGFuZGxlcl9ib3NzID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5pZ25vcmVfY29uc3VtZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLmNvbW1hbmRfaGFuZGxlcl9ib3NzKCkucmVnaXN0ZXJfaGFuZGxlcih0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBkZXN0cm95KCkge1xyXG4gICAgICAgIGlmKHRoaXMuY29ubmVjdGlvbikge1xyXG4gICAgICAgICAgICBjb25zdCBoYm9zcyA9IHRoaXMuY29ubmVjdGlvbi5jb21tYW5kX2hhbmRsZXJfYm9zcygpO1xyXG4gICAgICAgICAgICBoYm9zcyAmJiBoYm9zcy51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX2F3YWl0ZXJzX3VuaXF1ZV9pZHMgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlX2NvbW1hbmQoY29tbWFuZDogU2VydmVyQ29tbWFuZCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmKGNvbW1hbmQuY29tbWFuZCA9PSBcIm5vdGlmeWNsaWVudG5hbWVmcm9tdWlkXCIpXHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlX25vdGlmeWNsaWVudG5hbWVmcm9tdWlkKGNvbW1hbmQuYXJndW1lbnRzKTtcclxuICAgICAgICBpZihjb21tYW5kLmNvbW1hbmQgPT0gXCJub3RpZnljbGllbnRnZXRuYW1lZnJvbWRiaWRcIilcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVfbm90aWZ5Y2xpZW50Z2V0bmFtZWZyb21kYmlkKGNvbW1hbmQuYXJndW1lbnRzKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBqb2luQ2hhbm5lbChjaGFubmVsOiBDaGFubmVsRW50cnksIHBhc3N3b3JkPzogc3RyaW5nKSA6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3Rpb24uc2VuZF9jb21tYW5kKFwiY2xpZW50bW92ZVwiLCB7XHJcbiAgICAgICAgICAgIFwiY2xpZFwiOiB0aGlzLmNvbm5lY3Rpb24uY2xpZW50LmdldENsaWVudElkKCksXHJcbiAgICAgICAgICAgIFwiY2lkXCI6IGNoYW5uZWwuZ2V0Q2hhbm5lbElkKCksXHJcbiAgICAgICAgICAgIFwiY3B3XCI6IHBhc3N3b3JkIHx8IFwiXCJcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kTWVzc2FnZShtZXNzYWdlOiBzdHJpbmcsIHR5cGU6IENoYXRUeXBlLCB0YXJnZXQ/OiBDaGFubmVsRW50cnkgfCBDbGllbnRFbnRyeSkgOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcclxuICAgICAgICBpZih0eXBlID09IENoYXRUeXBlLlNFUlZFUilcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbi5zZW5kX2NvbW1hbmQoXCJzZW5kdGV4dG1lc3NhZ2VcIiwge1widGFyZ2V0bW9kZVwiOiAzLCBcInRhcmdldFwiOiAwLCBcIm1zZ1wiOiBtZXNzYWdlfSk7XHJcbiAgICAgICAgZWxzZSBpZih0eXBlID09IENoYXRUeXBlLkNIQU5ORUwpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3Rpb24uc2VuZF9jb21tYW5kKFwic2VuZHRleHRtZXNzYWdlXCIsIHtcInRhcmdldG1vZGVcIjogMiwgXCJ0YXJnZXRcIjogKHRhcmdldCBhcyBDaGFubmVsRW50cnkpLmdldENoYW5uZWxJZCgpLCBcIm1zZ1wiOiBtZXNzYWdlfSk7XHJcbiAgICAgICAgZWxzZSBpZih0eXBlID09IENoYXRUeXBlLkNMSUVOVClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbi5zZW5kX2NvbW1hbmQoXCJzZW5kdGV4dG1lc3NhZ2VcIiwge1widGFyZ2V0bW9kZVwiOiAxLCBcInRhcmdldFwiOiAodGFyZ2V0IGFzIENsaWVudEVudHJ5KS5jbGllbnRJZCgpLCBcIm1zZ1wiOiBtZXNzYWdlfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlQ2xpZW50KGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSA6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xyXG4gICAgICAgIGxldCBkYXRhID0ge307XHJcbiAgICAgICAgZGF0YVtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbi5zZW5kX2NvbW1hbmQoXCJjbGllbnR1cGRhdGVcIiwgZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgaW5mb19mcm9tX3VpZCguLi5fdW5pcXVlX2lkczogc3RyaW5nW10pIDogUHJvbWlzZTxDbGllbnROYW1lSW5mb1tdPiB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2U6IENsaWVudE5hbWVJbmZvW10gPSBbXTtcclxuICAgICAgICBjb25zdCByZXF1ZXN0ID0gW107XHJcbiAgICAgICAgY29uc3QgdW5pcXVlX2lkcyA9IG5ldyBTZXQoX3VuaXF1ZV9pZHMpO1xyXG4gICAgICAgIGlmKCF1bmlxdWVfaWRzLnNpemUpIHJldHVybiBbXTtcclxuXHJcbiAgICAgICAgY29uc3QgdW5pcXVlX2lkX3Jlc29sdmVyczoge1t1bmlxdWVfaWQ6IHN0cmluZ106IChyZXNvbHZlZDogQ2xpZW50TmFtZUluZm8pID0+IGFueX0gPSB7fTtcclxuXHJcblxyXG4gICAgICAgIGZvcihjb25zdCB1bmlxdWVfaWQgb2YgdW5pcXVlX2lkcykge1xyXG4gICAgICAgICAgICByZXF1ZXN0LnB1c2goeydjbHVpZCc6IHVuaXF1ZV9pZH0pO1xyXG4gICAgICAgICAgICAodGhpcy5fYXdhaXRlcnNfdW5pcXVlX2lkc1t1bmlxdWVfaWRdIHx8ICh0aGlzLl9hd2FpdGVyc191bmlxdWVfaWRzW3VuaXF1ZV9pZF0gPSBbXSkpXHJcbiAgICAgICAgICAgICAgICAucHVzaCh1bmlxdWVfaWRfcmVzb2x2ZXJzW3VuaXF1ZV9pZF0gPSBpbmZvID0+IHJlc3BvbnNlLnB1c2goaW5mbykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcImNsaWVudGdldG5hbWVmcm9tdWlkXCIsIHJlcXVlc3QpO1xyXG4gICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgaWYoZXJyb3IgaW5zdGFuY2VvZiBDb21tYW5kUmVzdWx0ICYmIGVycm9yLmlkID09IEVycm9ySUQuRU1QVFlfUkVTVUxUKSB7XHJcbiAgICAgICAgICAgICAgICAvKiBub3RoaW5nICovXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIC8qIGNsZWFudXAgKi9cclxuICAgICAgICAgICAgZm9yKGNvbnN0IHVuaXF1ZV9pZCBvZiBPYmplY3Qua2V5cyh1bmlxdWVfaWRfcmVzb2x2ZXJzKSlcclxuICAgICAgICAgICAgICAgICh0aGlzLl9hd2FpdGVyc191bmlxdWVfaWRzW3VuaXF1ZV9pZF0gfHwgW10pLnJlbW92ZSh1bmlxdWVfaWRfcmVzb2x2ZXJzW3VuaXF1ZV9pZF0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlX25vdGlmeWNsaWVudGdldG5hbWVmcm9tZGJpZChqc29uOiBhbnlbXSkge1xyXG4gICAgICAgIGZvcihjb25zdCBlbnRyeSBvZiBqc29uKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm86IENsaWVudE5hbWVJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50X3VuaXF1ZV9pZDogZW50cnlbXCJjbHVpZFwiXSxcclxuICAgICAgICAgICAgICAgIGNsaWVudF9uaWNrbmFtZTogZW50cnlbXCJjbG5hbWVcIl0sXHJcbiAgICAgICAgICAgICAgICBjbGllbnRfZGF0YWJhc2VfaWQ6IHBhcnNlSW50KGVudHJ5W1wiY2xkYmlkXCJdKVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZnVuY3Rpb25zID0gdGhpcy5fYXdhaXRlcnNfdW5pcXVlX2RiaWRbaW5mby5jbGllbnRfZGF0YWJhc2VfaWRdIHx8IFtdO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYXdhaXRlcnNfdW5pcXVlX2RiaWRbaW5mby5jbGllbnRfZGF0YWJhc2VfaWRdO1xyXG5cclxuICAgICAgICAgICAgZm9yKGNvbnN0IGZuIG9mIGZ1bmN0aW9ucylcclxuICAgICAgICAgICAgICAgIGZuKGluZm8pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBpbmZvX2Zyb21fY2xkYmlkKC4uLl9jbGRiaWQ6IG51bWJlcltdKSA6IFByb21pc2U8Q2xpZW50TmFtZUluZm9bXT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlOiBDbGllbnROYW1lSW5mb1tdID0gW107XHJcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZV9jbGRiaWQgPSBuZXcgU2V0KF9jbGRiaWQpO1xyXG4gICAgICAgIGlmKCF1bmlxdWVfY2xkYmlkLnNpemUpIHJldHVybiBbXTtcclxuXHJcbiAgICAgICAgY29uc3QgdW5pcXVlX2NsZGJpZF9yZXNvbHZlcnM6IHtbZGJpZDogbnVtYmVyXTogKHJlc29sdmVkOiBDbGllbnROYW1lSW5mbykgPT4gYW55fSA9IHt9O1xyXG5cclxuXHJcbiAgICAgICAgZm9yKGNvbnN0IGNsZGJpZCBvZiB1bmlxdWVfY2xkYmlkKSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3QucHVzaCh7J2NsZGJpZCc6IGNsZGJpZH0pO1xyXG4gICAgICAgICAgICAodGhpcy5fYXdhaXRlcnNfdW5pcXVlX2RiaWRbY2xkYmlkXSB8fCAodGhpcy5fYXdhaXRlcnNfdW5pcXVlX2RiaWRbY2xkYmlkXSA9IFtdKSlcclxuICAgICAgICAgICAgICAgIC5wdXNoKHVuaXF1ZV9jbGRiaWRfcmVzb2x2ZXJzW2NsZGJpZF0gPSBpbmZvID0+IHJlc3BvbnNlLnB1c2goaW5mbykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcImNsaWVudGdldG5hbWVmcm9tZGJpZFwiLCByZXF1ZXN0KTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgQ29tbWFuZFJlc3VsdCAmJiBlcnJvci5pZCA9PSBFcnJvcklELkVNUFRZX1JFU1VMVCkge1xyXG4gICAgICAgICAgICAgICAgLyogbm90aGluZyAqL1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgICAgICAvKiBjbGVhbnVwICovXHJcbiAgICAgICAgICAgIGZvcihjb25zdCBjbGRiaWQgb2YgT2JqZWN0LmtleXModW5pcXVlX2NsZGJpZF9yZXNvbHZlcnMpKVxyXG4gICAgICAgICAgICAgICAgKHRoaXMuX2F3YWl0ZXJzX3VuaXF1ZV9kYmlkW2NsZGJpZF0gfHwgW10pLnJlbW92ZSh1bmlxdWVfY2xkYmlkX3Jlc29sdmVyc1tjbGRiaWRdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZV9ub3RpZnljbGllbnRuYW1lZnJvbXVpZChqc29uOiBhbnlbXSkge1xyXG4gICAgICAgIGZvcihjb25zdCBlbnRyeSBvZiBqc29uKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm86IENsaWVudE5hbWVJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50X3VuaXF1ZV9pZDogZW50cnlbXCJjbHVpZFwiXSxcclxuICAgICAgICAgICAgICAgIGNsaWVudF9uaWNrbmFtZTogZW50cnlbXCJjbG5hbWVcIl0sXHJcbiAgICAgICAgICAgICAgICBjbGllbnRfZGF0YWJhc2VfaWQ6IHBhcnNlSW50KGVudHJ5W1wiY2xkYmlkXCJdKVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZnVuY3Rpb25zID0gdGhpcy5fYXdhaXRlcnNfdW5pcXVlX2lkc1tlbnRyeVtcImNsdWlkXCJdXSB8fCBbXTtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2F3YWl0ZXJzX3VuaXF1ZV9pZHNbZW50cnlbXCJjbHVpZFwiXV07XHJcblxyXG4gICAgICAgICAgICBmb3IoY29uc3QgZm4gb2YgZnVuY3Rpb25zKVxyXG4gICAgICAgICAgICAgICAgZm4oaW5mbyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlcXVlc3RfcXVlcnlfbGlzdChzZXJ2ZXJfaWQ6IG51bWJlciA9IHVuZGVmaW5lZCkgOiBQcm9taXNlPFF1ZXJ5TGlzdD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxRdWVyeUxpc3Q+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2luZ2xlX2hhbmRsZXIgPSB7XHJcbiAgICAgICAgICAgICAgICBjb21tYW5kOiBcIm5vdGlmeXF1ZXJ5bGlzdFwiLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb246IGNvbW1hbmQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBjb21tYW5kLmFyZ3VtZW50cztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge30gYXMgUXVlcnlMaXN0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZmxhZ19hbGwgPSBqc29uWzBdW1wiZmxhZ19hbGxcIl07XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmZsYWdfb3duID0ganNvblswXVtcImZsYWdfb3duXCJdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5xdWVyaWVzID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvcihjb25zdCBlbnRyeSBvZiBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbnRyeSA9IHt9IGFzIFF1ZXJ5TGlzdEVudHJ5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW50cnkuYm91bmRlZF9zZXJ2ZXIgPSBwYXJzZUludChlbnRyeVtcImNsaWVudF9ib3VuZF9zZXJ2ZXJcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW50cnkudXNlcm5hbWUgPSBlbnRyeVtcImNsaWVudF9sb2dpbl9uYW1lXCJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW50cnkudW5pcXVlX2lkID0gZW50cnlbXCJjbGllbnRfdW5pcXVlX2lkZW50aWZpZXJcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucXVlcmllcy5wdXNoKHJlbnRyeSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcl9ib3NzLnJlZ2lzdGVyX3NpbmdsZV9oYW5kbGVyKHNpbmdsZV9oYW5kbGVyKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBkYXRhID0ge307XHJcbiAgICAgICAgICAgIGlmKHNlcnZlcl9pZCAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgZGF0YVtcInNlcnZlcl9pZFwiXSA9IHNlcnZlcl9pZDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kX2NvbW1hbmQoXCJxdWVyeWxpc3RcIiwgZGF0YSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVyX2Jvc3MucmVtb3ZlX3NpbmdsZV9oYW5kbGVyKHNpbmdsZV9oYW5kbGVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihlcnJvciBpbnN0YW5jZW9mIENvbW1hbmRSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihlcnJvci5pZCA9PSBFcnJvcklELkVNUFRZX1JFU1VMVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHVuZGVmaW5lZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXF1ZXN0X3BsYXlsaXN0X2xpc3QoKSA6IFByb21pc2U8UGxheWxpc3RbXT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNpbmdsZV9oYW5kbGVyOiBTaW5nbGVDb21tYW5kSGFuZGxlciA9IHtcclxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6IFwibm90aWZ5cGxheWxpc3RsaXN0XCIsXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbjogY29tbWFuZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGNvbW1hbmQuYXJndW1lbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogUGxheWxpc3RbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmb3IoY29uc3QgZW50cnkgb2YganNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlsaXN0X2lkOiBwYXJzZUludChlbnRyeVtcInBsYXlsaXN0X2lkXCJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5bGlzdF9ib3RfaWQ6IHBhcnNlSW50KGVudHJ5W1wicGxheWxpc3RfYm90X2lkXCJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5bGlzdF90aXRsZTogZW50cnlbXCJwbGF5bGlzdF90aXRsZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5bGlzdF90eXBlOiBwYXJzZUludChlbnRyeVtcInBsYXlsaXN0X3R5cGVcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlsaXN0X293bmVyX2RiaWQ6IHBhcnNlSW50KGVudHJ5W1wicGxheWxpc3Rfb3duZXJfZGJpZFwiXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWxpc3Rfb3duZXJfbmFtZTogZW50cnlbXCJwbGF5bGlzdF9vd25lcl9uYW1lXCJdLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZWVkZWRfcG93ZXJfbW9kaWZ5OiBwYXJzZUludChlbnRyeVtcIm5lZWRlZF9wb3dlcl9tb2RpZnlcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lZWRlZF9wb3dlcl9wZXJtaXNzaW9uX21vZGlmeTogcGFyc2VJbnQoZW50cnlbXCJuZWVkZWRfcG93ZXJfcGVybWlzc2lvbl9tb2RpZnlcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lZWRlZF9wb3dlcl9kZWxldGU6IHBhcnNlSW50KGVudHJ5W1wibmVlZGVkX3Bvd2VyX2RlbGV0ZVwiXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVlZGVkX3Bvd2VyX3NvbmdfYWRkOiBwYXJzZUludChlbnRyeVtcIm5lZWRlZF9wb3dlcl9zb25nX2FkZFwiXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVlZGVkX3Bvd2VyX3NvbmdfbW92ZTogcGFyc2VJbnQoZW50cnlbXCJuZWVkZWRfcG93ZXJfc29uZ19tb3ZlXCJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZWVkZWRfcG93ZXJfc29uZ19yZW1vdmU6IHBhcnNlSW50KGVudHJ5W1wibmVlZGVkX3Bvd2VyX3NvbmdfcmVtb3ZlXCJdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5ORVRXT1JLSU5HLCB0cihcIkZhaWxlZCB0byBwYXJzZSBwbGF5bGlzdCBlbnRyeTogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJfYm9zcy5yZWdpc3Rlcl9zaW5nbGVfaGFuZGxlcihzaW5nbGVfaGFuZGxlcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZF9jb21tYW5kKFwicGxheWxpc3RsaXN0XCIpLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlcl9ib3NzLnJlbW92ZV9zaW5nbGVfaGFuZGxlcihzaW5nbGVfaGFuZGxlcik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZXJyb3IgaW5zdGFuY2VvZiBDb21tYW5kUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZXJyb3IuaWQgPT0gRXJyb3JJRC5FTVBUWV9SRVNVTFQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJlcXVlc3RfcGxheWxpc3Rfc29uZ3MocGxheWxpc3RfaWQ6IG51bWJlcikgOiBQcm9taXNlPFBsYXlsaXN0U29uZ1tdPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2luZ2xlX2hhbmRsZXI6IFNpbmdsZUNvbW1hbmRIYW5kbGVyID0ge1xyXG4gICAgICAgICAgICAgICAgY29tbWFuZDogXCJub3RpZnlwbGF5bGlzdHNvbmdsaXN0XCIsXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbjogY29tbWFuZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGNvbW1hbmQuYXJndW1lbnRzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZihqc29uWzBdW1wicGxheWxpc3RfaWRcIl0gIT0gcGxheWxpc3RfaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5Lk5FVFdPUktJTkcsIHRyKFwiUmVjZWl2ZWQgaW52YWxpZCBub3RpZmljYXRpb24gZm9yIHBsYXlsaXN0IHNvbmdzXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBQbGF5bGlzdFNvbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmb3IoY29uc3QgZW50cnkgb2YganNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbmdfaWQ6IHBhcnNlSW50KGVudHJ5W1wic29uZ19pZFwiXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc29uZ19pbnZva2VyOiBlbnRyeVtcInNvbmdfaW52b2tlclwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb25nX3ByZXZpb3VzX3NvbmdfaWQ6IHBhcnNlSW50KGVudHJ5W1wic29uZ19wcmV2aW91c19zb25nX2lkXCJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb25nX3VybDogZW50cnlbXCJzb25nX3VybFwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb25nX3VybF9sb2FkZXI6IGVudHJ5W1wic29uZ191cmxfbG9hZGVyXCJdLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb25nX2xvYWRlZDogZW50cnlbXCJzb25nX2xvYWRlZFwiXSA9PSB0cnVlIHx8IGVudHJ5W1wic29uZ19sb2FkZWRcIl0gPT0gXCIxXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc29uZ19tZXRhZGF0YTogZW50cnlbXCJzb25nX21ldGFkYXRhXCJdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5Lk5FVFdPUktJTkcsIHRyKFwiRmFpbGVkIHRvIHBhcnNlIHBsYXlsaXN0IHNvbmcgZW50cnk6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVyX2Jvc3MucmVnaXN0ZXJfc2luZ2xlX2hhbmRsZXIoc2luZ2xlX2hhbmRsZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcInBsYXlsaXN0c29uZ2xpc3RcIiwge3BsYXlsaXN0X2lkOiBwbGF5bGlzdF9pZH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlcl9ib3NzLnJlbW92ZV9zaW5nbGVfaGFuZGxlcihzaW5nbGVfaGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICBpZihlcnJvciBpbnN0YW5jZW9mIENvbW1hbmRSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihlcnJvci5pZCA9PSBFcnJvcklELkVNUFRZX1JFU1VMVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVxdWVzdF9wbGF5bGlzdF9jbGllbnRfbGlzdChwbGF5bGlzdF9pZDogbnVtYmVyKSA6IFByb21pc2U8bnVtYmVyW10+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzaW5nbGVfaGFuZGxlcjogU2luZ2xlQ29tbWFuZEhhbmRsZXIgPSB7XHJcbiAgICAgICAgICAgICAgICBjb21tYW5kOiBcIm5vdGlmeXBsYXlsaXN0Y2xpZW50bGlzdFwiLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb246IGNvbW1hbmQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBjb21tYW5kLmFyZ3VtZW50cztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoanNvblswXVtcInBsYXlsaXN0X2lkXCJdICE9IHBsYXlsaXN0X2lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5ORVRXT1JLSU5HLCB0cihcIlJlY2VpdmVkIGludmFsaWQgbm90aWZpY2F0aW9uIGZvciBwbGF5bGlzdCBjbGllbnRzXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBudW1iZXJbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmb3IoY29uc3QgZW50cnkgb2YganNvbilcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gocGFyc2VJbnQoZW50cnlbXCJjbGRiaWRcIl0pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQuZmlsdGVyKGUgPT4gIWlzTmFOKGUpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcl9ib3NzLnJlZ2lzdGVyX3NpbmdsZV9oYW5kbGVyKHNpbmdsZV9oYW5kbGVyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kX2NvbW1hbmQoXCJwbGF5bGlzdGNsaWVudGxpc3RcIiwge3BsYXlsaXN0X2lkOiBwbGF5bGlzdF9pZH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlcl9ib3NzLnJlbW92ZV9zaW5nbGVfaGFuZGxlcihzaW5nbGVfaGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICBpZihlcnJvciBpbnN0YW5jZW9mIENvbW1hbmRSZXN1bHQgJiYgZXJyb3IuaWQgPT0gRXJyb3JJRC5FTVBUWV9SRVNVTFQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHJlcXVlc3RfY2xpZW50c19ieV9zZXJ2ZXJfZ3JvdXAoZ3JvdXBfaWQ6IG51bWJlcikgOiBQcm9taXNlPFNlcnZlckdyb3VwQ2xpZW50W10+IHtcclxuICAgICAgICAvL3NlcnZlcmdyb3VwY2xpZW50bGlzdCBzZ2lkPTJcclxuICAgICAgICAvL25vdGlmeXNlcnZlcmdyb3VwY2xpZW50bGlzdCBzZ2lkPTYgY2xkYmlkPTIgY2xpZW50X25pY2tuYW1lPVdvbHZlcmluREVWIGNsaWVudF91bmlxdWVfaWRlbnRpZmllcj14eGpuYzE0TG12VGsrTHlybThPT2VvNHRPcXc9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFNlcnZlckdyb3VwQ2xpZW50W10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2luZ2xlX2hhbmRsZXI6IFNpbmdsZUNvbW1hbmRIYW5kbGVyID0ge1xyXG4gICAgICAgICAgICAgICAgY29tbWFuZDogXCJub3RpZnlzZXJ2ZXJncm91cGNsaWVudGxpc3RcIixcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uOiBjb21tYW5kID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29tbWFuZC5hcmd1bWVudHNbMF1bXCJzZ2lkXCJdICE9IGdyb3VwX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5ORVRXT1JLSU5HLCB0cihcIlJlY2VpdmVkIGludmFsaWQgbm90aWZpY2F0aW9uIGZvciBzZXJ2ZXIgZ3JvdXAgY2xpZW50IGxpc3RcIikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IFNlcnZlckdyb3VwQ2xpZW50W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGNvbnN0IGVudHJ5IG9mIGNvbW1hbmQuYXJndW1lbnRzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudF9kYXRhYmFzZV9pZDogcGFyc2VJbnQoZW50cnlbXCJjbGRiaWRcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudF9uaWNrbmFtZTogZW50cnlbXCJjbGllbnRfbmlja25hbWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50X3VuaXF1ZV9pZGVudGlmaWVyOiBlbnRyeVtcImNsaWVudF91bmlxdWVfaWRlbnRpZmllclwiXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuTkVUV09SS0lORywgdHIoXCJGYWlsZWQgdG8gcGFyc2Ugc2VydmVyIGdyb3VwIGNsaWVudCBsaXN0OiAlb1wiKSwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoXCJmYWlsZWQgdG8gcGFyc2UgaW5mb1wiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJfYm9zcy5yZWdpc3Rlcl9zaW5nbGVfaGFuZGxlcihzaW5nbGVfaGFuZGxlcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZF9jb21tYW5kKFwic2VydmVyZ3JvdXBjbGllbnRsaXN0XCIsIHtzZ2lkOiBncm91cF9pZH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlcl9ib3NzLnJlbW92ZV9zaW5nbGVfaGFuZGxlcihzaW5nbGVfaGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJlcXVlc3RfcGxheWxpc3RfaW5mbyhwbGF5bGlzdF9pZDogbnVtYmVyKSA6IFByb21pc2U8UGxheWxpc3RJbmZvPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2luZ2xlX2hhbmRsZXI6IFNpbmdsZUNvbW1hbmRIYW5kbGVyID0ge1xyXG4gICAgICAgICAgICAgICAgY29tbWFuZDogXCJub3RpZnlwbGF5bGlzdGluZm9cIixcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uOiBjb21tYW5kID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gY29tbWFuZC5hcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGpzb25bXCJwbGF5bGlzdF9pZFwiXSAhPSBwbGF5bGlzdF9pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuTkVUV09SS0lORywgdHIoXCJSZWNlaXZlZCBpbnZhbGlkIG5vdGlmaWNhdGlvbiBmb3IgcGxheWxpc3QgaW5mb1wiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vcmVzb2x2ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlsaXN0X2lkOiBwYXJzZUludChqc29uW1wicGxheWxpc3RfaWRcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWxpc3RfdGl0bGU6IGpzb25bXCJwbGF5bGlzdF90aXRsZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlsaXN0X2Rlc2NyaXB0aW9uOiBqc29uW1wicGxheWxpc3RfZGVzY3JpcHRpb25cIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5bGlzdF90eXBlOiBwYXJzZUludChqc29uW1wicGxheWxpc3RfdHlwZVwiXSksXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWxpc3Rfb3duZXJfZGJpZDogcGFyc2VJbnQoanNvbltcInBsYXlsaXN0X293bmVyX2RiaWRcIl0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWxpc3Rfb3duZXJfbmFtZToganNvbltcInBsYXlsaXN0X293bmVyX25hbWVcIl0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWxpc3RfZmxhZ19kZWxldGVfcGxheWVkOiBqc29uW1wicGxheWxpc3RfZmxhZ19kZWxldGVfcGxheWVkXCJdID09IHRydWUgfHwganNvbltcInBsYXlsaXN0X2ZsYWdfZGVsZXRlX3BsYXllZFwiXSA9PSBcIjFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlsaXN0X2ZsYWdfZmluaXNoZWQ6IGpzb25bXCJwbGF5bGlzdF9mbGFnX2ZpbmlzaGVkXCJdID09IHRydWUgfHwganNvbltcInBsYXlsaXN0X2ZsYWdfZmluaXNoZWRcIl0gPT0gXCIxXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5bGlzdF9yZXBsYXlfbW9kZTogcGFyc2VJbnQoanNvbltcInBsYXlsaXN0X3JlcGxheV9tb2RlXCJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlsaXN0X2N1cnJlbnRfc29uZ19pZDogcGFyc2VJbnQoanNvbltcInBsYXlsaXN0X2N1cnJlbnRfc29uZ19pZFwiXSksXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWxpc3RfbWF4X3NvbmdzOiBwYXJzZUludChqc29uW1wicGxheWxpc3RfbWF4X3NvbmdzXCJdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuTkVUV09SS0lORywgdHIoXCJGYWlsZWQgdG8gcGFyc2UgcGxheWxpc3QgaW5mbzogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiZmFpbGVkIHRvIHBhcnNlIGluZm9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVyX2Jvc3MucmVnaXN0ZXJfc2luZ2xlX2hhbmRsZXIoc2luZ2xlX2hhbmRsZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcInBsYXlsaXN0aW5mb1wiLCB7cGxheWxpc3RfaWQ6IHBsYXlsaXN0X2lkfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVyX2Jvc3MucmVtb3ZlX3NpbmdsZV9oYW5kbGVyKHNpbmdsZV9oYW5kbGVyKTtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZGVwcmVjYXRlZFxyXG4gICAgICogIEl0cyBqdXN0IGEgd29ya2Fyb3VuZCBmb3IgdGhlIHF1ZXJ5IG1hbmFnZW1lbnQuXHJcbiAgICAgKiAgVGhlcmUgaXMgbm8gZ2FyYW50ZSB0aGF0IHRoZSB3aG9hbWkgdHJpY2sgd2lsbCB3b3JrIGZvcmV2ZXJcclxuICAgICAqL1xyXG4gICAgY3VycmVudF92aXJ0dWFsX3NlcnZlcl9pZCgpIDogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgICAgICBpZih0aGlzLl93aG9fYW1faSlcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShwYXJzZUludCh0aGlzLl93aG9fYW1faVtcInZpcnR1YWxzZXJ2ZXJfaWRcIl0pKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzaW5nbGVfaGFuZGxlcjogU2luZ2xlQ29tbWFuZEhhbmRsZXIgPSB7XHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbjogY29tbWFuZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoY29tbWFuZC5jb21tYW5kICE9IFwiXCIgJiYgY29tbWFuZC5jb21tYW5kLmluZGV4T2YoXCI9XCIpID09IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dob19hbV9pID0gY29tbWFuZC5hcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShwYXJzZUludCh0aGlzLl93aG9fYW1faVtcInZpcnR1YWxzZXJ2ZXJfaWRcIl0pKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVyX2Jvc3MucmVnaXN0ZXJfc2luZ2xlX2hhbmRsZXIoc2luZ2xlX2hhbmRsZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcIndob2FtaVwiKS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZXJfYm9zcy5yZW1vdmVfc2luZ2xlX2hhbmRsZXIoc2luZ2xlX2hhbmRsZXIpO1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQge0Nvbm5lY3Rpb25IYW5kbGVyLCBDb25uZWN0aW9uU3RhdGV9IGZyb20gXCIuLi9Db25uZWN0aW9uSGFuZGxlclwiO1xyXG5pbXBvcnQge1NlcnZlckFkZHJlc3N9IGZyb20gXCIuLi9jaGFubmVsLXRyZWUvc2VydmVyXCI7XHJcbmltcG9ydCB7Q29tbWFuZFJlc3VsdH0gZnJvbSBcIi4vU2VydmVyQ29ubmVjdGlvbkRlY2xhcmF0aW9uXCI7XHJcbmltcG9ydCB7UmVjb3JkZXJQcm9maWxlfSBmcm9tIFwiLi4vdm9pY2UvUmVjb3JkZXJQcm9maWxlXCI7XHJcbmltcG9ydCB7Q29tbWFuZEhlbHBlcn0gZnJvbSBcIi4vQ29tbWFuZEhlbHBlclwiO1xyXG5pbXBvcnQge2Nvbm5lY3Rpb259IGZyb20gXCIuL0hhbmRzaGFrZUhhbmRsZXJcIjtcclxuaW1wb3J0IEhhbmRzaGFrZUhhbmRsZXIgPSBjb25uZWN0aW9uLkhhbmRzaGFrZUhhbmRsZXI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRPcHRpb25zIHtcclxuICAgIGZsYWdzZXQ/OiBzdHJpbmdbXTsgLyogZGVmYXVsdDogW10gKi9cclxuICAgIHByb2Nlc3NfcmVzdWx0PzogYm9vbGVhbjsgLyogZGVmYXVsdDogdHJ1ZSAqL1xyXG5cclxuICAgIHRpbWVvdXQ/OiBudW1iZXIgLyogZGVmYXVsdDogMTAwMCAqLztcclxufVxyXG5leHBvcnQgY29uc3QgQ29tbWFuZE9wdGlvbkRlZmF1bHRzOiBDb21tYW5kT3B0aW9ucyA9IHtcclxuICAgIGZsYWdzZXQ6IFtdLFxyXG4gICAgcHJvY2Vzc19yZXN1bHQ6IHRydWUsXHJcbiAgICB0aW1lb3V0OiAxMDAwXHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBDb25uZWN0aW9uU3RhdGVMaXN0ZW5lciA9IChvbGRfc3RhdGU6IENvbm5lY3Rpb25TdGF0ZSwgbmV3X3N0YXRlOiBDb25uZWN0aW9uU3RhdGUpID0+IGFueTtcclxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbiB7XHJcbiAgICByZWFkb25seSBjbGllbnQ6IENvbm5lY3Rpb25IYW5kbGVyO1xyXG4gICAgcmVhZG9ubHkgY29tbWFuZF9oZWxwZXI6IENvbW1hbmRIZWxwZXI7XHJcblxyXG4gICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKGNsaWVudDogQ29ubmVjdGlvbkhhbmRsZXIpIHtcclxuICAgICAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuXHJcbiAgICAgICAgdGhpcy5jb21tYW5kX2hlbHBlciA9IG5ldyBDb21tYW5kSGVscGVyKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qIHJlc29sdmVkIGFzIHNvb24gYSBjb25uZWN0aW9uIGhhcyBiZWVuIGVzdGFibGlzaGVkLiBUaGlzIGRvZXMgbm90IG1lYW5zIHRoYXQgdGhlIGF1dGhlbnRpY2F0aW9uIGhhZCB5ZXQgYmVlbiBkb25lISAqL1xyXG4gICAgYWJzdHJhY3QgY29ubmVjdChhZGRyZXNzOiBTZXJ2ZXJBZGRyZXNzLCBoYW5kc2hha2U6IEhhbmRzaGFrZUhhbmRsZXIsIHRpbWVvdXQ/OiBudW1iZXIpIDogUHJvbWlzZTx2b2lkPjtcclxuXHJcbiAgICBhYnN0cmFjdCBjb25uZWN0ZWQoKSA6IGJvb2xlYW47XHJcbiAgICBhYnN0cmFjdCBkaXNjb25uZWN0KHJlYXNvbj86IHN0cmluZykgOiBQcm9taXNlPHZvaWQ+O1xyXG5cclxuICAgIGFic3RyYWN0IHN1cHBvcnRfdm9pY2UoKSA6IGJvb2xlYW47XHJcbiAgICBhYnN0cmFjdCB2b2ljZV9jb25uZWN0aW9uKCkgOiB2b2ljZS5BYnN0cmFjdFZvaWNlQ29ubmVjdGlvbiB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICBhYnN0cmFjdCBjb21tYW5kX2hhbmRsZXJfYm9zcygpIDogQWJzdHJhY3RDb21tYW5kSGFuZGxlckJvc3M7XHJcbiAgICBhYnN0cmFjdCBzZW5kX2NvbW1hbmQoY29tbWFuZDogc3RyaW5nLCBkYXRhPzogYW55IHwgYW55W10sIG9wdGlvbnM/OiBDb21tYW5kT3B0aW9ucykgOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+O1xyXG5cclxuICAgIGFic3RyYWN0IGdldCBvbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZWQoKSA6IENvbm5lY3Rpb25TdGF0ZUxpc3RlbmVyO1xyXG4gICAgYWJzdHJhY3Qgc2V0IG9uY29ubmVjdGlvbnN0YXRlY2hhbmdlZChsaXN0ZW5lcjogQ29ubmVjdGlvblN0YXRlTGlzdGVuZXIpO1xyXG5cclxuICAgIGFic3RyYWN0IHJlbW90ZV9hZGRyZXNzKCkgOiBTZXJ2ZXJBZGRyZXNzOyAvKiBvbmx5IHZhbGlkIHdoZW4gY29ubmVjdGVkICovXHJcbiAgICBhYnN0cmFjdCBoYW5kc2hha2VfaGFuZGxlcigpIDogSGFuZHNoYWtlSGFuZGxlcjsgLyogb25seSB2YWxpZCB3aGVuIGNvbm5lY3RlZCAqL1xyXG5cclxuICAgIGFic3RyYWN0IHBpbmcoKSA6IHtcclxuICAgICAgICBuYXRpdmU6IG51bWJlcixcclxuICAgICAgICBqYXZhc2NyaXB0PzogbnVtYmVyXHJcbiAgICB9O1xyXG59XHJcblxyXG5leHBvcnQgbmFtZXNwYWNlIHZvaWNlIHtcclxuICAgIGV4cG9ydCBlbnVtIFBsYXllclN0YXRlIHtcclxuICAgICAgICBQUkVCVUZGRVJJTkcsXHJcbiAgICAgICAgUExBWUlORyxcclxuICAgICAgICBCVUZGRVJJTkcsXHJcbiAgICAgICAgU1RPUFBJTkcsXHJcbiAgICAgICAgU1RPUFBFRFxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCB0eXBlIExhdGVuY3lTZXR0aW5ncyA9IHtcclxuICAgICAgICBtaW5fYnVmZmVyOiBudW1iZXI7IC8qIG1pbGxpc2Vjb25kcyAqL1xyXG4gICAgICAgIG1heF9idWZmZXI6IG51bWJlcjsgLyogbWlsbGlzZWNvbmRzICovXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBWb2ljZUNsaWVudCB7XHJcbiAgICAgICAgY2xpZW50X2lkOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNhbGxiYWNrX3BsYXliYWNrOiAoKSA9PiBhbnk7XHJcbiAgICAgICAgY2FsbGJhY2tfc3RvcHBlZDogKCkgPT4gYW55O1xyXG5cclxuICAgICAgICBjYWxsYmFja19zdGF0ZV9jaGFuZ2VkOiAobmV3X3N0YXRlOiBQbGF5ZXJTdGF0ZSkgPT4gYW55O1xyXG5cclxuICAgICAgICBnZXRfc3RhdGUoKSA6IFBsYXllclN0YXRlO1xyXG5cclxuICAgICAgICBnZXRfdm9sdW1lKCkgOiBudW1iZXI7XHJcbiAgICAgICAgc2V0X3ZvbHVtZSh2b2x1bWU6IG51bWJlcikgOiB2b2lkO1xyXG5cclxuICAgICAgICBhYm9ydF9yZXBsYXkoKTtcclxuXHJcbiAgICAgICAgc3VwcG9ydF9sYXRlbmN5X3NldHRpbmdzKCkgOiBib29sZWFuO1xyXG5cclxuICAgICAgICByZXNldF9sYXRlbmN5X3NldHRpbmdzKCk7XHJcbiAgICAgICAgbGF0ZW5jeV9zZXR0aW5ncyhzZXR0aW5ncz86IExhdGVuY3lTZXR0aW5ncykgOiBMYXRlbmN5U2V0dGluZ3M7XHJcblxyXG4gICAgICAgIHN1cHBvcnRfZmx1c2goKSA6IGJvb2xlYW47XHJcbiAgICAgICAgZmx1c2goKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RWb2ljZUNvbm5lY3Rpb24ge1xyXG4gICAgICAgIHJlYWRvbmx5IGNvbm5lY3Rpb246IEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbjtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWJzdHJhY3QgY29ubmVjdGVkKCkgOiBib29sZWFuO1xyXG4gICAgICAgIGFic3RyYWN0IGVuY29kaW5nX3N1cHBvcnRlZChjb2RlYzogbnVtYmVyKSA6IGJvb2xlYW47XHJcbiAgICAgICAgYWJzdHJhY3QgZGVjb2Rpbmdfc3VwcG9ydGVkKGNvZGVjOiBudW1iZXIpIDogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgYWJzdHJhY3QgcmVnaXN0ZXJfY2xpZW50KGNsaWVudF9pZDogbnVtYmVyKSA6IFZvaWNlQ2xpZW50O1xyXG4gICAgICAgIGFic3RyYWN0IGF2YWlsYWJsZV9jbGllbnRzKCkgOiBWb2ljZUNsaWVudFtdO1xyXG4gICAgICAgIGFic3RyYWN0IHVucmVnaXN0ZXJfY2xpZW50KGNsaWVudDogVm9pY2VDbGllbnQpIDogUHJvbWlzZTx2b2lkPjtcclxuXHJcbiAgICAgICAgYWJzdHJhY3Qgdm9pY2VfcmVjb3JkZXIoKSA6IFJlY29yZGVyUHJvZmlsZTtcclxuICAgICAgICBhYnN0cmFjdCBhY3F1aXJlX3ZvaWNlX3JlY29yZGVyKHJlY29yZGVyOiBSZWNvcmRlclByb2ZpbGUgfCB1bmRlZmluZWQpIDogUHJvbWlzZTx2b2lkPjtcclxuXHJcbiAgICAgICAgYWJzdHJhY3QgZ2V0X2VuY29kZXJfY29kZWMoKSA6IG51bWJlcjtcclxuICAgICAgICBhYnN0cmFjdCBzZXRfZW5jb2Rlcl9jb2RlYyhjb2RlYzogbnVtYmVyKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNlcnZlckNvbW1hbmQge1xyXG4gICAgY29tbWFuZDogc3RyaW5nO1xyXG4gICAgYXJndW1lbnRzOiBhbnlbXTtcclxufVxyXG5cclxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFic3RyYWN0Q29tbWFuZEhhbmRsZXIge1xyXG4gICAgcmVhZG9ubHkgY29ubmVjdGlvbjogQWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9uO1xyXG5cclxuICAgIGhhbmRsZXJfYm9zczogQWJzdHJhY3RDb21tYW5kSGFuZGxlckJvc3MgfCB1bmRlZmluZWQ7XHJcbiAgICB2b2xhdGlsZV9oYW5kbGVyX2Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgLyogaWYgdHJ1ZSB0aGFuIHRoZSBjb21tYW5kIGhhbmRsZXIgY291bGQgYmUgcmVnaXN0ZXJlZCB0d2ljZSB0byB0d28gb3IgbW9yZSBoYW5kbGVycyAqL1xyXG5cclxuICAgIGlnbm9yZV9jb25zdW1lZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIHByb3RlY3RlZCBjb25zdHJ1Y3Rvcihjb25uZWN0aW9uOiBBYnN0cmFjdFNlcnZlckNvbm5lY3Rpb24pIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybiBJZiB0aGUgY29tbWFuZCBzaG91bGQgYmUgY29uc3VtZWRcclxuICAgICAqL1xyXG4gICAgYWJzdHJhY3QgaGFuZGxlX2NvbW1hbmQoY29tbWFuZDogU2VydmVyQ29tbWFuZCkgOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNpbmdsZUNvbW1hbmRIYW5kbGVyIHtcclxuICAgIG5hbWU/OiBzdHJpbmc7XHJcbiAgICBjb21tYW5kPzogc3RyaW5nO1xyXG4gICAgdGltZW91dD86IG51bWJlcjtcclxuXHJcbiAgICAvKiBpZiB0aGUgcmV0dXJuIGlzIHRydWUgdGhlbiB0aGUgY29tbWFuZCBoYW5kbGVyIHdpbGwgYmUgcmVtb3ZlZCAqL1xyXG4gICAgZnVuY3Rpb246IChjb21tYW5kOiBTZXJ2ZXJDb21tYW5kKSA9PiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RDb21tYW5kSGFuZGxlckJvc3Mge1xyXG4gICAgcmVhZG9ubHkgY29ubmVjdGlvbjogQWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9uO1xyXG4gICAgcHJvdGVjdGVkIGNvbW1hbmRfaGFuZGxlcnM6IEFic3RyYWN0Q29tbWFuZEhhbmRsZXJbXSA9IFtdO1xyXG4gICAgLyogVE9ETzogVGltZW91dCAqL1xyXG4gICAgcHJvdGVjdGVkIHNpbmdsZV9jb21tYW5kX2hhbmRsZXI6IFNpbmdsZUNvbW1hbmRIYW5kbGVyW10gPSBbXTtcclxuXHJcbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBkZXN0cm95KCkge1xyXG4gICAgICAgIHRoaXMuY29tbWFuZF9oYW5kbGVycyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLnNpbmdsZV9jb21tYW5kX2hhbmRsZXIgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmVnaXN0ZXJfaGFuZGxlcihoYW5kbGVyOiBBYnN0cmFjdENvbW1hbmRIYW5kbGVyKSB7XHJcbiAgICAgICAgaWYoIWhhbmRsZXIudm9sYXRpbGVfaGFuZGxlcl9ib3NzICYmIGhhbmRsZXIuaGFuZGxlcl9ib3NzKVxyXG4gICAgICAgICAgICB0aHJvdyBcImhhbmRsZXIgYWxyZWFkeSByZWdpc3RlcmVkXCI7XHJcblxyXG4gICAgICAgIHRoaXMuY29tbWFuZF9oYW5kbGVycy5yZW1vdmUoaGFuZGxlcik7IC8qIGp1c3QgdG8gYmUgc3VyZSAqL1xyXG4gICAgICAgIHRoaXMuY29tbWFuZF9oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xyXG4gICAgICAgIGhhbmRsZXIuaGFuZGxlcl9ib3NzID0gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB1bnJlZ2lzdGVyX2hhbmRsZXIoaGFuZGxlcjogQWJzdHJhY3RDb21tYW5kSGFuZGxlcikge1xyXG4gICAgICAgIGlmKCFoYW5kbGVyLnZvbGF0aWxlX2hhbmRsZXJfYm9zcyAmJiBoYW5kbGVyLmhhbmRsZXJfYm9zcyAhPT0gdGhpcykge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4odHIoXCJUcmllZCB0byB1bnJlZ2lzdGVyIGNvbW1hbmQgaGFuZGxlciB3aGljaCBkb2VzIG5vdCBiZWxvbmcgdG8gdGhlIGhhbmRsZXIgYm9zc1wiKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29tbWFuZF9oYW5kbGVycy5yZW1vdmUoaGFuZGxlcik7XHJcbiAgICAgICAgaGFuZGxlci5oYW5kbGVyX2Jvc3MgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJlZ2lzdGVyX3NpbmdsZV9oYW5kbGVyKGhhbmRsZXI6IFNpbmdsZUNvbW1hbmRIYW5kbGVyKSB7XHJcbiAgICAgICAgdGhpcy5zaW5nbGVfY29tbWFuZF9oYW5kbGVyLnB1c2goaGFuZGxlcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlX3NpbmdsZV9oYW5kbGVyKGhhbmRsZXI6IFNpbmdsZUNvbW1hbmRIYW5kbGVyKSB7XHJcbiAgICAgICAgdGhpcy5zaW5nbGVfY29tbWFuZF9oYW5kbGVyLnJlbW92ZShoYW5kbGVyKTtcclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVycygpIDogQWJzdHJhY3RDb21tYW5kSGFuZGxlcltdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb21tYW5kX2hhbmRsZXJzO1xyXG4gICAgfVxyXG5cclxuICAgIGludm9rZV9oYW5kbGUoY29tbWFuZDogU2VydmVyQ29tbWFuZCkgOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgZmxhZ19jb25zdW1lZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IoY29uc3QgaGFuZGxlciBvZiB0aGlzLmNvbW1hbmRfaGFuZGxlcnMpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmKCFmbGFnX2NvbnN1bWVkIHx8IGhhbmRsZXIuaWdub3JlX2NvbnN1bWVkKVxyXG4gICAgICAgICAgICAgICAgICAgIGZsYWdfY29uc3VtZWQgPSBmbGFnX2NvbnN1bWVkIHx8IGhhbmRsZXIuaGFuZGxlX2NvbW1hbmQoY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJGYWlsZWQgdG8gaW52b2tlIGNvbW1hbmQgaGFuZGxlci4gSW52b2NhdGlvbiByZXN1bHRzIGluIGFuIGV4Y2VwdGlvbjogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yKGNvbnN0IGhhbmRsZXIgb2YgWy4uLnRoaXMuc2luZ2xlX2NvbW1hbmRfaGFuZGxlcl0pIHtcclxuICAgICAgICAgICAgaWYoaGFuZGxlci5jb21tYW5kICYmIGhhbmRsZXIuY29tbWFuZCAhPSBjb21tYW5kLmNvbW1hbmQpXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZihoYW5kbGVyLmZ1bmN0aW9uKGNvbW1hbmQpKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2luZ2xlX2NvbW1hbmRfaGFuZGxlci5yZW1vdmUoaGFuZGxlcik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJGYWlsZWQgdG8gaW52b2tlIHNpbmdsZSBjb21tYW5kIGhhbmRsZXIuIEludm9jYXRpb24gcmVzdWx0cyBpbiBhbiBleGNlcHRpb246ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmbGFnX2NvbnN1bWVkO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHtMYXRlclByb21pc2V9IGZyb20gXCIuLi91dGlscy9oZWxwZXJzXCI7XHJcblxyXG5leHBvcnQgZW51bSBFcnJvcklEIHtcclxuICAgIE5PVF9JTVBMRU1FTlRFRCA9IDB4MixcclxuICAgIENPTU1BTkRfTk9UX0ZPVU5EID0gMHgxMDAsXHJcblxyXG4gICAgUEVSTUlTU0lPTl9FUlJPUiA9IDI1NjgsXHJcbiAgICBFTVBUWV9SRVNVTFQgPSAweDA1MDEsXHJcbiAgICBQTEFZTElTVF9JU19JTl9VU0UgPSAweDIxMDMsXHJcblxyXG4gICAgRklMRV9BTFJFQURZX0VYSVNUUyA9IDIwNTAsXHJcblxyXG4gICAgQ0xJRU5UX0lOVkFMSURfSUQgPSAweDAyMDAsXHJcblxyXG4gICAgQ09OVkVSU0FUSU9OX0lOVkFMSURfSUQgPSAweDIyMDAsXHJcbiAgICBDT05WRVJTQVRJT05fTU9SRV9EQVRBID0gMHgyMjAxLFxyXG4gICAgQ09OVkVSU0FUSU9OX0lTX1BSSVZBVEUgPSAweDIyMDJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENvbW1hbmRSZXN1bHQge1xyXG4gICAgc3VjY2VzczogYm9vbGVhbjtcclxuICAgIGlkOiBudW1iZXI7XHJcbiAgICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgICBleHRyYV9tZXNzYWdlOiBzdHJpbmc7XHJcblxyXG4gICAganNvbjogYW55O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGpzb24pIHtcclxuICAgICAgICB0aGlzLmpzb24gPSBqc29uO1xyXG4gICAgICAgIHRoaXMuaWQgPSBwYXJzZUludChqc29uW1wiaWRcIl0pO1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IGpzb25bXCJtc2dcIl07XHJcblxyXG4gICAgICAgIHRoaXMuZXh0cmFfbWVzc2FnZSA9IFwiXCI7XHJcbiAgICAgICAgaWYoanNvbltcImV4dHJhX21zZ1wiXSkgdGhpcy5leHRyYV9tZXNzYWdlID0ganNvbltcImV4dHJhX21zZ1wiXTtcclxuXHJcbiAgICAgICAgdGhpcy5zdWNjZXNzID0gdGhpcy5pZCA9PSAwO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENsaWVudE5hbWVJbmZvIHtcclxuICAgIC8vY2x1aWQ9dFl6S1VyeW5cXC9cXC9ZOFZCTWY4UEhVVDZCMWVpRT0gbmFtZT1FeHAgY2xuYW1lPUV4cCBjbGRiaWQ9OVxyXG4gICAgY2xpZW50X3VuaXF1ZV9pZDogc3RyaW5nO1xyXG4gICAgY2xpZW50X25pY2tuYW1lOiBzdHJpbmc7XHJcbiAgICBjbGllbnRfZGF0YWJhc2VfaWQ6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDbGllbnROYW1lRnJvbVVpZCB7XHJcbiAgICBwcm9taXNlOiBMYXRlclByb21pc2U8Q2xpZW50TmFtZUluZm9bXT4sXHJcbiAgICBrZXlzOiBzdHJpbmdbXSxcclxuICAgIHJlc3BvbnNlOiBDbGllbnROYW1lSW5mb1tdXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyR3JvdXBDbGllbnQge1xyXG4gICAgY2xpZW50X25pY2tuYW1lOiBzdHJpbmc7XHJcbiAgICBjbGllbnRfdW5pcXVlX2lkZW50aWZpZXI6IHN0cmluZztcclxuICAgIGNsaWVudF9kYXRhYmFzZV9pZDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFF1ZXJ5TGlzdEVudHJ5IHtcclxuICAgIHVzZXJuYW1lOiBzdHJpbmc7XHJcbiAgICB1bmlxdWVfaWQ6IHN0cmluZztcclxuICAgIGJvdW5kZWRfc2VydmVyOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUXVlcnlMaXN0IHtcclxuICAgIGZsYWdfb3duOiBib29sZWFuO1xyXG4gICAgZmxhZ19hbGw6IGJvb2xlYW47XHJcblxyXG4gICAgcXVlcmllczogUXVlcnlMaXN0RW50cnlbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5bGlzdCB7XHJcbiAgICBwbGF5bGlzdF9pZDogbnVtYmVyO1xyXG4gICAgcGxheWxpc3RfYm90X2lkOiBudW1iZXI7XHJcbiAgICBwbGF5bGlzdF90aXRsZTogc3RyaW5nO1xyXG4gICAgcGxheWxpc3RfdHlwZTogbnVtYmVyO1xyXG4gICAgcGxheWxpc3Rfb3duZXJfZGJpZDogbnVtYmVyO1xyXG4gICAgcGxheWxpc3Rfb3duZXJfbmFtZTogc3RyaW5nO1xyXG5cclxuICAgIG5lZWRlZF9wb3dlcl9tb2RpZnk6IG51bWJlcjtcclxuICAgIG5lZWRlZF9wb3dlcl9wZXJtaXNzaW9uX21vZGlmeTogbnVtYmVyO1xyXG4gICAgbmVlZGVkX3Bvd2VyX2RlbGV0ZTogbnVtYmVyO1xyXG4gICAgbmVlZGVkX3Bvd2VyX3NvbmdfYWRkOiBudW1iZXI7XHJcbiAgICBuZWVkZWRfcG93ZXJfc29uZ19tb3ZlOiBudW1iZXI7XHJcbiAgICBuZWVkZWRfcG93ZXJfc29uZ19yZW1vdmU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQbGF5bGlzdEluZm8ge1xyXG4gICAgcGxheWxpc3RfaWQ6IG51bWJlcixcclxuICAgIHBsYXlsaXN0X3RpdGxlOiBzdHJpbmcsXHJcbiAgICBwbGF5bGlzdF9kZXNjcmlwdGlvbjogc3RyaW5nLFxyXG4gICAgcGxheWxpc3RfdHlwZTogbnVtYmVyLFxyXG5cclxuICAgIHBsYXlsaXN0X293bmVyX2RiaWQ6IG51bWJlcixcclxuICAgIHBsYXlsaXN0X293bmVyX25hbWU6IHN0cmluZyxcclxuXHJcbiAgICBwbGF5bGlzdF9mbGFnX2RlbGV0ZV9wbGF5ZWQ6IGJvb2xlYW4sXHJcbiAgICBwbGF5bGlzdF9mbGFnX2ZpbmlzaGVkOiBib29sZWFuLFxyXG4gICAgcGxheWxpc3RfcmVwbGF5X21vZGU6IG51bWJlcixcclxuICAgIHBsYXlsaXN0X2N1cnJlbnRfc29uZ19pZDogbnVtYmVyLFxyXG5cclxuICAgIHBsYXlsaXN0X21heF9zb25nczogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGxheWxpc3RTb25nIHtcclxuICAgIHNvbmdfaWQ6IG51bWJlcjtcclxuICAgIHNvbmdfcHJldmlvdXNfc29uZ19pZDogbnVtYmVyO1xyXG4gICAgc29uZ19pbnZva2VyOiBzdHJpbmc7XHJcbiAgICBzb25nX3VybDogc3RyaW5nO1xyXG4gICAgc29uZ191cmxfbG9hZGVyOiBzdHJpbmc7XHJcbiAgICBzb25nX2xvYWRlZDogYm9vbGVhbjtcclxuICAgIHNvbmdfbWV0YWRhdGE6IHN0cmluZztcclxufSIsIi8vIEFTTi4xIEphdmFTY3JpcHQgZGVjb2RlclxyXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxOCBMYXBvIEx1Y2hpbmkgPGxhcG9AbGFwby5pdD5cclxuLy8gQ29weXJpZ2h0IChjKSAyMDE5LTIwMTkgTWFya3VzIEhhZGVuZmVsZHQgPGdpdEB0ZWFzcGVhay5kZT5cclxuXHJcbi8vIFBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG4vLyBwdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQsIHByb3ZpZGVkIHRoYXQgdGhlIGFib3ZlXHJcbi8vIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2UgYXBwZWFyIGluIGFsbCBjb3BpZXMuXHJcbi8vXHJcbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTXHJcbi8vIFdJVEggUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0ZcclxuLy8gTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1JcclxuLy8gQU5ZIFNQRUNJQUwsIERJUkVDVCwgSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFU1xyXG4vLyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NIExPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU5cclxuLy8gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SIE9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0ZcclxuLy8gT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1IgUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuXHJcbmV4cG9ydCBuYW1lc3BhY2UgYXNuMSB7XHJcbiAgICBkZWNsYXJlIGNsYXNzIEludDEwIHtcclxuICAgICAgICBjb25zdHJ1Y3Rvcih2YWx1ZT86IGFueSk7XHJcblxyXG4gICAgICAgIHN1YihzdWI6IG51bWJlcik7XHJcbiAgICAgICAgbXVsQWRkKG11bDogbnVtYmVyLCBhZGQ6IG51bWJlcik7XHJcbiAgICAgICAgc2ltcGxpZnkoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbGxpcHNpcyA9IFwiXFx1MjAyNlwiO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN0cmluZ19jdXQoc3RyLCBsZW4pIHtcclxuICAgICAgICBpZiAoc3RyLmxlbmd0aCA+IGxlbilcclxuICAgICAgICAgICAgc3RyID0gc3RyLnN1YnN0cmluZygwLCBsZW4pICsgZWxsaXBzaXM7XHJcbiAgICAgICAgcmV0dXJuIHN0cjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3RyZWFtIHtcclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBIRVhfRElHSVRTID0gXCIwMTIzNDU2Nzg5QUJDREVGXCI7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVUaW1lUyA9IC9eKFxcZFxcZCkoMFsxLTldfDFbMC0yXSkoMFsxLTldfFsxMl1cXGR8M1swMV0pKFswMV1cXGR8MlswLTNdKSg/OihbMC01XVxcZCkoPzooWzAtNV1cXGQpKD86Wy4sXShcXGR7MSwzfSkpPyk/KT8oWnxbLStdKD86WzBdXFxkfDFbMC0yXSkoWzAtNV1cXGQpPyk/JC87XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgcmVUaW1lTCA9IC9eKFxcZFxcZFxcZFxcZCkoMFsxLTldfDFbMC0yXSkoMFsxLTldfFsxMl1cXGR8M1swMV0pKFswMV1cXGR8MlswLTNdKSg/OihbMC01XVxcZCkoPzooWzAtNV1cXGQpKD86Wy4sXShcXGR7MSwzfSkpPyk/KT8oWnxbLStdKD86WzBdXFxkfDFbMC0yXSkoWzAtNV1cXGQpPyk/JC87XHJcblxyXG4gICAgICAgIHBvc2l0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgZGF0YTogc3RyaW5nIHwgQXJyYXlCdWZmZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKGRhdGE6IHN0cmluZyB8IFN0cmVhbSB8IEFycmF5QnVmZmVyLCBwb3NpdGlvbjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmIChkYXRhIGluc3RhbmNlb2YgU3RyZWFtKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YS5kYXRhO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGVuZ3RoKCkgOiBudW1iZXIge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhLmJ5dGVMZW5ndGg7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0KHBvc2l0aW9uPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uKys7XHJcblxyXG4gICAgICAgICAgICBpZiAocG9zaXRpb24gPj0gdGhpcy5sZW5ndGgoKSlcclxuICAgICAgICAgICAgICAgIHRocm93ICdSZXF1ZXN0aW5nIGJ5dGUgb2Zmc2V0ICcgKyB0aGlzLnBvc2l0aW9uICsgJyBvbiBhIHN0cmVhbSBvZiBsZW5ndGggJyArIHRoaXMubGVuZ3RoKCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZih0aGlzLmRhdGEpID09PSBcInN0cmluZ1wiKSA/IHRoaXMuZGF0YS5jaGFyQ29kZUF0KHBvc2l0aW9uKSA6IHRoaXMuZGF0YVtwb3NpdGlvbl07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoZXhCeXRlKGJ5dGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gU3RyZWFtLkhFWF9ESUdJVFMuY2hhckF0KChieXRlID4+IDQpICYgMHhGKSArIFN0cmVhbS5IRVhfRElHSVRTLmNoYXJBdChieXRlICYgMHhGKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhcnNlU3RyaW5nSVNPKHN0YXJ0LCBlbmQpIHtcclxuICAgICAgICAgICAgbGV0IHMgPSBcIlwiO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSlcclxuICAgICAgICAgICAgICAgIHMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSh0aGlzLmdldChpKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGFyc2VTdHJpbmdVVEYoc3RhcnQsIGVuZCkge1xyXG4gICAgICAgICAgICBsZXQgcyA9IFwiXCI7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDspIHtcclxuICAgICAgICAgICAgICAgIGxldCBjID0gdGhpcy5nZXQoaSsrKTtcclxuICAgICAgICAgICAgICAgIGlmIChjIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgICAgIHMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjID4gMTkxKSAmJiAoYyA8IDIyNCkpXHJcbiAgICAgICAgICAgICAgICAgICAgcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCgoYyAmIDB4MUYpIDw8IDYpIHwgKHRoaXMuZ2V0KGkrKykgJiAweDNGKSk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCgoYyAmIDB4MEYpIDw8IDEyKSB8ICgodGhpcy5nZXQoaSsrKSAmIDB4M0YpIDw8IDYpIHwgKHRoaXMuZ2V0KGkrKykgJiAweDNGKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJzZVN0cmluZ0JNUChzdGFydCwgZW5kKSB7XHJcbiAgICAgICAgICAgIGxldCBzdHIgPSBcIlwiLCBoaSwgbG87XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDspIHtcclxuICAgICAgICAgICAgICAgIGhpID0gdGhpcy5nZXQoaSsrKTtcclxuICAgICAgICAgICAgICAgIGxvID0gdGhpcy5nZXQoaSsrKTtcclxuICAgICAgICAgICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChoaSA8PCA4KSB8IGxvKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gc3RyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGFyc2VUaW1lKHN0YXJ0LCBlbmQsIHNob3J0WWVhcikge1xyXG4gICAgICAgICAgICBsZXQgcyA9IHRoaXMucGFyc2VTdHJpbmdJU08oc3RhcnQsIGVuZCksXHJcbiAgICAgICAgICAgICAgICBtID0gKHNob3J0WWVhciA/IFN0cmVhbS5yZVRpbWVTIDogU3RyZWFtLnJlVGltZUwpLmV4ZWMocyk7XHJcbiAgICAgICAgICAgIGlmICghbSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlVucmVjb2duaXplZCB0aW1lOiBcIiArIHM7XHJcbiAgICAgICAgICAgIGlmIChzaG9ydFllYXIpIHtcclxuICAgICAgICAgICAgICAgIC8vIHRvIGF2b2lkIHF1ZXJ5aW5nIHRoZSB0aW1lciwgdXNlIHRoZSBmaXhlZCByYW5nZSBbMTk3MCwgMjA2OV1cclxuICAgICAgICAgICAgICAgIC8vIGl0IHdpbGwgY29uZm9ybSB3aXRoIElUVSBYLjQwMCBbLTEwLCArNDBdIHNsaWRpbmcgd2luZG93IHVudGlsIDIwMzBcclxuICAgICAgICAgICAgICAgIC8vbVsxXSA9ICttWzFdO1xyXG4gICAgICAgICAgICAgICAgLy9tWzFdICs9IChwYXJzZUludChtWzFdKSA8IDcwKSA/IDIwMDAgOiAxOTAwO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJmaXhtZSFcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzID0gbVsxXSArIFwiLVwiICsgbVsyXSArIFwiLVwiICsgbVszXSArIFwiIFwiICsgbVs0XTtcclxuICAgICAgICAgICAgaWYgKG1bNV0pIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gXCI6XCIgKyBtWzVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1bNl0pIHtcclxuICAgICAgICAgICAgICAgICAgICBzICs9IFwiOlwiICsgbVs2XTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobVs3XSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcyArPSBcIi5cIiArIG1bN107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG1bOF0pIHtcclxuICAgICAgICAgICAgICAgIHMgKz0gXCIgVVRDXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAobVs4XSAhPSAnWicpIHtcclxuICAgICAgICAgICAgICAgICAgICBzICs9IG1bOF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1bOV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHMgKz0gXCI6XCIgKyBtWzldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBzO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHBhcnNlSW50ZWdlcihzdGFydCwgZW5kKSB7XHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50OiBudW1iZXIgPSB0aGlzLmdldChzdGFydCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbmVnYXRpdmUgPSAoY3VycmVudCA+IDEyNyk7XHJcbiAgICAgICAgICAgIGxldCBwYWRkaW5nID0gbmVnYXRpdmUgPyAyNTUgOiAwO1xyXG4gICAgICAgICAgICBsZXQgbGVuZ3RoO1xyXG4gICAgICAgICAgICBsZXQgZGVzY3JpcHRvcjogbnVtYmVyIHwgc3RyaW5nO1xyXG5cclxuICAgICAgICAgICAgLy8gc2tpcCB1bnVzZWZ1bCBiaXRzIChub3QgYWxsb3dlZCBpbiBERVIpXHJcbiAgICAgICAgICAgIHdoaWxlIChjdXJyZW50ID09IHBhZGRpbmcgJiYgKytzdGFydCA8IGVuZClcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQgPSB0aGlzLmdldChzdGFydCk7XHJcblxyXG4gICAgICAgICAgICBsZW5ndGggPSBlbmQgLSBzdGFydDtcclxuICAgICAgICAgICAgaWYgKGxlbmd0aCA9PT0gMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZWdhdGl2ZSA/ICctMScgOiAnMCc7XHJcblxyXG4gICAgICAgICAgICAvLyBzaG93IGJpdCBsZW5ndGggb2YgaHVnZSBpbnRlZ2Vyc1xyXG4gICAgICAgICAgICBpZiAobGVuZ3RoID4gNCkge1xyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRvciA9IGN1cnJlbnQ7XHJcbiAgICAgICAgICAgICAgICBsZW5ndGggPDw9IDM7IC8qIGNhbGN1bGF0ZSBiaXQgbGVuZ3RoICovXHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKCgoZGVzY3JpcHRvciBeIHBhZGRpbmcpICYgMHg4MCkgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0b3IgPDw9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgLS1sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdG9yID0gXCIoXCIgKyBsZW5ndGggKyBcIiBiaXQpXFxuXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZGVjb2RlIHRoZSBpbnRlZ2VyXHJcbiAgICAgICAgICAgIGlmIChuZWdhdGl2ZSkgY3VycmVudCA9IGN1cnJlbnQgLSAyNTY7XHJcblxyXG4gICAgICAgICAgICBsZXQgbnVtYmVyID0gXCJcIjtcclxuICAgICAgICAgICAgaWYodHlwZW9mKEludDEwKSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgbGV0IG4gPSBuZXcgSW50MTAoY3VycmVudCk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQgKyAxOyBpIDwgZW5kOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgbi5tdWxBZGQoMjU2LCB0aGlzLmdldChpKSk7XHJcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBuLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbiA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQgKyAxOyBpIDwgZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBuIDw8PSA4O1xyXG4gICAgICAgICAgICAgICAgICAgIG4gKz0gdGhpcy5nZXQoaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBuLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IgKyBudW1iZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaXNBU0NJSShzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuZ2V0KGkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGMgPCAzMiB8fCBjID4gMTc2KVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHBhcnNlQml0U3RyaW5nKHN0YXJ0LCBlbmQsIG1heExlbmd0aCkge1xyXG4gICAgICAgICAgICBsZXQgdW51c2VkQml0ID0gdGhpcy5nZXQoc3RhcnQpLFxyXG4gICAgICAgICAgICAgICAgbGVuQml0ID0gKChlbmQgLSBzdGFydCAtIDEpIDw8IDMpIC0gdW51c2VkQml0LFxyXG4gICAgICAgICAgICAgICAgaW50cm8gPSBcIihcIiArIGxlbkJpdCArIFwiIGJpdClcXG5cIixcclxuICAgICAgICAgICAgICAgIHMgPSBcIlwiO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQgKyAxOyBpIDwgZW5kOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGxldCBiID0gdGhpcy5nZXQoaSksXHJcbiAgICAgICAgICAgICAgICAgICAgc2tpcCA9IChpID09IGVuZCAtIDEpID8gdW51c2VkQml0IDogMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSA3OyBqID49IHNraXA7IC0tailcclxuICAgICAgICAgICAgICAgICAgICBzICs9IChiID4+IGopICYgMSA/IFwiMVwiIDogXCIwXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAocy5sZW5ndGggPiBtYXhMZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGludHJvICsgc3RyaW5nX2N1dChzLCBtYXhMZW5ndGgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBpbnRybyArIHM7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcGFyc2VPY3RldFN0cmluZyhzdGFydCwgZW5kLCBtYXhMZW5ndGgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBU0NJSShzdGFydCwgZW5kKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdHJpbmdfY3V0KHRoaXMucGFyc2VTdHJpbmdJU08oc3RhcnQsIGVuZCksIG1heExlbmd0aCk7XHJcbiAgICAgICAgICAgIGxldCBsZW4gPSBlbmQgLSBzdGFydCxcclxuICAgICAgICAgICAgICAgIHMgPSBcIihcIiArIGxlbiArIFwiIGJ5dGUpXFxuXCI7XHJcbiAgICAgICAgICAgIG1heExlbmd0aCAvPSAyOyAvLyB3ZSB3b3JrIGluIGJ5dGVzXHJcbiAgICAgICAgICAgIGlmIChsZW4gPiBtYXhMZW5ndGgpXHJcbiAgICAgICAgICAgICAgICBlbmQgPSBzdGFydCArIG1heExlbmd0aDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpXHJcbiAgICAgICAgICAgICAgICBzICs9IHRoaXMuaGV4Qnl0ZSh0aGlzLmdldChpKSk7XHJcbiAgICAgICAgICAgIGlmIChsZW4gPiBtYXhMZW5ndGgpXHJcbiAgICAgICAgICAgICAgICBzICs9IGVsbGlwc2lzO1xyXG4gICAgICAgICAgICByZXR1cm4gcztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwYXJzZU9JRChzdGFydCwgZW5kLCBtYXhMZW5ndGgpIHtcclxuICAgICAgICAgICAgbGV0IHMgPSAnJyxcclxuICAgICAgICAgICAgICAgIG4gPSBuZXcgSW50MTAoKSxcclxuICAgICAgICAgICAgICAgIGJpdHMgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHYgPSB0aGlzLmdldChpKTtcclxuICAgICAgICAgICAgICAgIG4ubXVsQWRkKDEyOCwgdiAmIDB4N0YpO1xyXG4gICAgICAgICAgICAgICAgYml0cyArPSA3O1xyXG4gICAgICAgICAgICAgICAgaWYgKCEodiAmIDB4ODApKSB7IC8vIGZpbmlzaGVkXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMgPT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG4gPSBuLnNpbXBsaWZ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuIGluc3RhbmNlb2YgSW50MTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG4uc3ViKDgwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBcIjIuXCIgKyBuLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbSA9IG4gPCA4MCA/IG4gPCA0MCA/IDAgOiAxIDogMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBtICsgXCIuXCIgKyAobiAtIG0gKiA0MCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgcyArPSBcIi5cIiArIG4udG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocy5sZW5ndGggPiBtYXhMZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHJpbmdfY3V0KHMsIG1heExlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbiA9IG5ldyBJbnQxMCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJpdHMgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChiaXRzID4gMClcclxuICAgICAgICAgICAgICAgIHMgKz0gXCIuaW5jb21wbGV0ZVwiO1xyXG4gICAgICAgICAgICAvKiBGSVhNRVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9pZHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2lkID0gb2lkc1tzXTtcclxuICAgICAgICAgICAgICAgIGlmIChvaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAob2lkLmQpIHMgKz0gXCJcXG5cIiArIG9pZC5kO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvaWQuYykgcyArPSBcIlxcblwiICsgb2lkLmM7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9pZC53KSBzICs9IFwiXFxuKHdhcm5pbmchKVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJldHVybiBzO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gVGFnQ2xhc3Mge1xyXG4gICAgICAgIFVOSVZFUlNBTCA9IDB4MDAsXHJcbiAgICAgICAgQVBQTElDQVRJT04gPSAweDAxLFxyXG4gICAgICAgIENPTlRFWFQgPSAweDAyLFxyXG4gICAgICAgIFBSSVZBVEUgPSAweDAzXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gVGFnVHlwZSB7XHJcbiAgICAgICAgRU9DID0gMHgwMCxcclxuICAgICAgICBCT09MRUFOID0gMHgwMSxcclxuICAgICAgICBJTlRFR0VSID0gMHgwMixcclxuICAgICAgICBCSVRfU1RSSU5HID0gMHgwMyxcclxuICAgICAgICBPQ1RFVF9TVFJJTkcgPSAweDA0LFxyXG4gICAgICAgIE5VTEwgPSAweDA1LFxyXG4gICAgICAgIE9CSkVDVF9JREVOVElGSUVSID0gMHgwNixcclxuICAgICAgICBPYmplY3REZXNjcmlwdG9yID0gMHgwNyxcclxuICAgICAgICBFWFRFUk5BTCA9IDB4MDgsXHJcbiAgICAgICAgUkVBTCA9IDB4MDksXHJcbiAgICAgICAgRU5VTUVSQVRFRCA9IDB4MEEsXHJcbiAgICAgICAgRU1CRURERURfUERWID0gMHgwQixcclxuICAgICAgICBVVEY4U3RyaW5nID0gMHgwQyxcclxuICAgICAgICBTRVFVRU5DRSA9IDB4MTAsXHJcbiAgICAgICAgU0VUID0gMHgxMSxcclxuICAgICAgICBOdW1lcmljU3RyaW5nID0gMHgxMixcclxuICAgICAgICBQcmludGFibGVTdHJpbmcgPSAweDEzLCAvLyBBU0NJSSBzdWJzZXRcclxuICAgICAgICBUZWxldGV4dFN0cmluZyA9IDB4MTQsIC8vIGFrYSBUNjFTdHJpbmdcclxuICAgICAgICBWaWRlb3RleFN0cmluZyA9IDB4MTUsXHJcbiAgICAgICAgSUE1U3RyaW5nID0gMHgxNiwgLy8gQVNDSUlcclxuICAgICAgICBVVENUaW1lID0gMHgxNyxcclxuICAgICAgICBHZW5lcmFsaXplZFRpbWUgPSAweDE4LFxyXG4gICAgICAgIEdyYXBoaWNTdHJpbmcgPSAweDE5LFxyXG4gICAgICAgIFZpc2libGVTdHJpbmcgPSAweDFBLCAvLyBBU0NJSSBzdWJzZXRcclxuICAgICAgICBHZW5lcmFsU3RyaW5nID0gMHgxQixcclxuICAgICAgICBVbml2ZXJzYWxTdHJpbmcgPSAweDFDLFxyXG4gICAgICAgIEJNUFN0cmluZyA9IDB4MUVcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBBU04xVGFnIHtcclxuICAgICAgICB0YWdDbGFzczogVGFnQ2xhc3M7XHJcbiAgICAgICAgdHlwZTogVGFnVHlwZTtcclxuICAgICAgICB0YWdDb25zdHJ1Y3RlZDogYm9vbGVhbjtcclxuICAgICAgICB0YWdOdW1iZXI6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3Ioc3RyZWFtOiBTdHJlYW0pIHtcclxuICAgICAgICAgICAgbGV0IGJ1ZiA9IHN0cmVhbS5nZXQoKTtcclxuICAgICAgICAgICAgdGhpcy50YWdDbGFzcyA9IGJ1ZiA+PiA2O1xyXG4gICAgICAgICAgICB0aGlzLnRhZ0NvbnN0cnVjdGVkID0gKChidWYgJiAweDIwKSAhPT0gMCk7XHJcbiAgICAgICAgICAgIHRoaXMudGFnTnVtYmVyID0gYnVmICYgMHgxRjtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGFnTnVtYmVyID09IDB4MUYpIHsgLy8gbG9uZyB0YWdcclxuICAgICAgICAgICAgICAgIGxldCBuID0gbmV3IEludDEwKCk7XHJcbiAgICAgICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnVmID0gc3RyZWFtLmdldCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG4ubXVsQWRkKDEyOCwgYnVmICYgMHg3Rik7XHJcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChidWYgJiAweDgwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFnTnVtYmVyID0gbi5zaW1wbGlmeSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpc1VuaXZlcnNhbCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGFnQ2xhc3MgPT09IDB4MDA7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaXNFT0MoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRhZ0NsYXNzID09PSAweDAwICYmIHRoaXMudGFnTnVtYmVyID09PSAweDAwO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEFTTjEge1xyXG4gICAgICAgIHN0cmVhbTogU3RyZWFtO1xyXG4gICAgICAgIGhlYWRlcjogbnVtYmVyO1xyXG4gICAgICAgIGxlbmd0aDogbnVtYmVyO1xyXG4gICAgICAgIHRhZzogQVNOMVRhZztcclxuICAgICAgICBjaGlsZHJlbjogQVNOMVtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihzdHJlYW06IFN0cmVhbSwgaGVhZGVyOiBudW1iZXIsIGxlbmd0aDogbnVtYmVyLCB0YWc6IEFTTjFUYWcsIGNoaWxkcmVuOiBBU04xW10pIHtcclxuICAgICAgICAgICAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XHJcbiAgICAgICAgICAgIHRoaXMuaGVhZGVyID0gaGVhZGVyO1xyXG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSB0YWc7XHJcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnRlbnQobWF4X2xlbmd0aD86IG51bWJlciwgdHlwZT86IFRhZ1R5cGUpIHsgLy8gYSBwcmV2aWV3IG9mIHRoZSBjb250ZW50IChpbnRlbmRlZCBmb3IgaHVtYW5zKVxyXG4gICAgICAgICAgICBpZiAodGhpcy50YWcgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChtYXhfbGVuZ3RoID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICBtYXhfbGVuZ3RoID0gSW5maW5pdHk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY29udGVudCA9IHRoaXMucG9zQ29udGVudCgpLFxyXG4gICAgICAgICAgICAgICAgbGVuID0gTWF0aC5hYnModGhpcy5sZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRhZy5pc1VuaXZlcnNhbCgpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGlsZHJlbiAhPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCIoXCIgKyB0aGlzLmNoaWxkcmVuLmxlbmd0aCArIFwiIGVsZW0pXCI7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdHJlYW0ucGFyc2VPY3RldFN0cmluZyhjb250ZW50LCBjb250ZW50ICsgbGVuLCBtYXhfbGVuZ3RoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUgfHwgdGhpcy50YWcudGFnTnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDE6IC8vIEJPT0xFQU5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHRoaXMuc3RyZWFtLmdldChjb250ZW50KSA9PT0gMCkgPyBcImZhbHNlXCIgOiBcInRydWVcIjtcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwMjogLy8gSU5URUdFUlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN0cmVhbS5wYXJzZUludGVnZXIoY29udGVudCwgY29udGVudCArIGxlbik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDM6IC8vIEJJVF9TVFJJTkdcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbiA/IFwiKFwiICsgdGhpcy5jaGlsZHJlbi5sZW5ndGggKyBcIiBlbGVtKVwiIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHJlYW0ucGFyc2VCaXRTdHJpbmcoY29udGVudCwgY29udGVudCArIGxlbiwgbWF4X2xlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDQ6IC8vIE9DVEVUX1NUUklOR1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuID8gXCIoXCIgKyB0aGlzLmNoaWxkcmVuLmxlbmd0aCArIFwiIGVsZW0pXCIgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0cmVhbS5wYXJzZU9jdGV0U3RyaW5nKGNvbnRlbnQsIGNvbnRlbnQgKyBsZW4sIG1heF9sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgLy9jYXNlIDB4MDU6IC8vIE5VTExcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwNjogLy8gT0JKRUNUX0lERU5USUZJRVJcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zdHJlYW0ucGFyc2VPSUQoY29udGVudCwgY29udGVudCArIGxlbiwgbWF4X2xlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAvL2Nhc2UgMHgwNzogLy8gT2JqZWN0RGVzY3JpcHRvclxyXG4gICAgICAgICAgICAgICAgLy9jYXNlIDB4MDg6IC8vIEVYVEVSTkFMXHJcbiAgICAgICAgICAgICAgICAvL2Nhc2UgMHgwOTogLy8gUkVBTFxyXG4gICAgICAgICAgICAgICAgLy9jYXNlIDB4MEE6IC8vIEVOVU1FUkFURURcclxuICAgICAgICAgICAgICAgIC8vY2FzZSAweDBCOiAvLyBFTUJFRERFRF9QRFZcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgxMDogLy8gU0VRVUVOQ0VcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgxMTogLy8gU0VUXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW4gIT09IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIihcIiArIHRoaXMuY2hpbGRyZW4ubGVuZ3RoICsgXCIgZWxlbSlcIjtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIihubyBlbGVtKVwiO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAweDBDOiAvLyBVVEY4U3RyaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZ19jdXQodGhpcy5zdHJlYW0ucGFyc2VTdHJpbmdVVEYoY29udGVudCwgY29udGVudCArIGxlbiksIG1heF9sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAweDEyOiAvLyBOdW1lcmljU3RyaW5nXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTM6IC8vIFByaW50YWJsZVN0cmluZ1xyXG4gICAgICAgICAgICAgICAgY2FzZSAweDE0OiAvLyBUZWxldGV4U3RyaW5nXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTU6IC8vIFZpZGVvdGV4U3RyaW5nXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTY6IC8vIElBNVN0cmluZ1xyXG4gICAgICAgICAgICAgICAgLy9jYXNlIDB4MTk6IC8vIEdyYXBoaWNTdHJpbmdcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgxQTogLy8gVmlzaWJsZVN0cmluZ1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY2FzZSAweDFCOiAvLyBHZW5lcmFsU3RyaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgLy9jYXNlIDB4MUM6IC8vIFVuaXZlcnNhbFN0cmluZ1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHJpbmdfY3V0KHRoaXMuc3RyZWFtLnBhcnNlU3RyaW5nSVNPKGNvbnRlbnQsIGNvbnRlbnQgKyBsZW4pLCBtYXhfbGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgxRTogLy8gQk1QU3RyaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZ19jdXQodGhpcy5zdHJlYW0ucGFyc2VTdHJpbmdCTVAoY29udGVudCwgY29udGVudCArIGxlbiksIG1heF9sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAweDE3OiAvLyBVVENUaW1lXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTg6IC8vIEdlbmVyYWxpemVkVGltZVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN0cmVhbS5wYXJzZVRpbWUoY29udGVudCwgY29udGVudCArIGxlbiwgKHRoaXMudGFnLnRhZ051bWJlciA9PSAweDE3KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdHlwZU5hbWUoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnRhZy50YWdDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiAvLyB1bml2ZXJzYWxcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVGFnVHlwZVt0aGlzLnRhZy50YWdOdW1iZXJdIHx8IChcIlVuaXZlcnNhbF9cIiArIHRoaXMudGFnLnRhZ051bWJlci50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJBcHBsaWNhdGlvbl9cIiArIHRoaXMudGFnLnRhZ051bWJlci50b1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIltcIiArIHRoaXMudGFnLnRhZ051bWJlci50b1N0cmluZygpICsgXCJdXCI7IC8vIENvbnRleHRcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJQcml2YXRlX1wiICsgdGhpcy50YWcudGFnTnVtYmVyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0b1N0cmluZygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHlwZU5hbWUoKSArIFwiQFwiICsgdGhpcy5zdHJlYW0ucG9zaXRpb24gKyBcIltoZWFkZXI6XCIgKyB0aGlzLmhlYWRlciArIFwiLGxlbmd0aDpcIiArIHRoaXMubGVuZ3RoICsgXCIsc3ViOlwiICsgKCh0aGlzLmNoaWxkcmVuID09PSBudWxsKSA/ICdudWxsJyA6IHRoaXMuY2hpbGRyZW4ubGVuZ3RoKSArIFwiXVwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdG9QcmV0dHlTdHJpbmcoaW5kZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChpbmRlbnQgPT09IHVuZGVmaW5lZCkgaW5kZW50ID0gJyc7XHJcbiAgICAgICAgICAgIGxldCBzID0gaW5kZW50ICsgdGhpcy50eXBlTmFtZSgpICsgXCIgQFwiICsgdGhpcy5zdHJlYW0ucG9zaXRpb247XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxlbmd0aCA+PSAwKVxyXG4gICAgICAgICAgICAgICAgcyArPSBcIitcIjtcclxuICAgICAgICAgICAgcyArPSB0aGlzLmxlbmd0aDtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGFnLnRhZ0NvbnN0cnVjdGVkKVxyXG4gICAgICAgICAgICAgICAgcyArPSBcIiAoY29uc3RydWN0ZWQpXCI7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKCh0aGlzLnRhZy5pc1VuaXZlcnNhbCgpICYmICgodGhpcy50YWcudGFnTnVtYmVyID09IDB4MDMpIHx8ICh0aGlzLnRhZy50YWdOdW1iZXIgPT0gMHgwNCkpKSAmJiAodGhpcy5jaGlsZHJlbiAhPT0gbnVsbCkpXHJcbiAgICAgICAgICAgICAgICBzICs9IFwiIChlbmNhcHN1bGF0ZXMpXCI7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gdGhpcy5jb250ZW50KCk7XHJcbiAgICAgICAgICAgIGlmIChjb250ZW50KVxyXG4gICAgICAgICAgICAgICAgcyArPSBcIjogXCIgKyBjb250ZW50LnJlcGxhY2UoL1xcbi9nLCAnfCcpO1xyXG4gICAgICAgICAgICBzICs9IFwiXFxuXCI7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNoaWxkcmVuICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRlbnQgKz0gJyAgJztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBtYXggPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSA8IG1heDsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHMgKz0gdGhpcy5jaGlsZHJlbltpXS50b1ByZXR0eVN0cmluZyhpbmRlbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBzO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHBvc1N0YXJ0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdHJlYW0ucG9zaXRpb247XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcG9zQ29udGVudCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RyZWFtLnBvc2l0aW9uICsgdGhpcy5oZWFkZXI7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcG9zRW5kKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdHJlYW0ucG9zaXRpb24gKyB0aGlzLmhlYWRlciArIE1hdGguYWJzKHRoaXMubGVuZ3RoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzdGF0aWMgZGVjb2RlTGVuZ3RoKHN0cmVhbTogU3RyZWFtKSB7XHJcbiAgICAgICAgICAgIGxldCBidWYgPSBzdHJlYW0uZ2V0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGJ1ZiAmIDB4N0Y7XHJcbiAgICAgICAgICAgIGlmIChsZW4gPT0gYnVmKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlbjtcclxuICAgICAgICAgICAgaWYgKGxlbiA+IDYpIC8vIG5vIHJlYXNvbiB0byB1c2UgSW50MTAsIGFzIGl0IHdvdWxkIGJlIGEgaHVnZSBidWZmZXIgYW55d2F5c1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJMZW5ndGggb3ZlciA0OCBiaXRzIG5vdCBzdXBwb3J0ZWQgYXQgcG9zaXRpb24gXCIgKyAoc3RyZWFtLnBvc2l0aW9uIC0gMSk7XHJcbiAgICAgICAgICAgIGlmIChsZW4gPT09IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDsgLy8gdW5kZWZpbmVkXHJcblxyXG4gICAgICAgICAgICBidWYgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgKytpKVxyXG4gICAgICAgICAgICAgICAgYnVmID0gKGJ1ZiA8PCA4KSArIHN0cmVhbS5nZXQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzdGF0aWMgZW5jb2RlTGVuZ3RoKGJ1ZmZlcjogVWludDhBcnJheSwgb2Zmc2V0OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmKGxlbmd0aCA8IDB4N0YpIHtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXRdID0gbGVuZ3RoO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyW29mZnNldF0gPSAweDgwO1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gMTtcclxuICAgICAgICAgICAgICAgIHdoaWxlKGxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0ICsgaW5kZXgrK10gPSBsZW5ndGggJiAweEZGO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlbmd0aCA+Pj0gODtcclxuICAgICAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0XSArPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlY29kZTAoc3RyZWFtOiBTdHJlYW0pIHtcclxuICAgICAgICBjb25zdCBzdHJlYW1TdGFydCA9IG5ldyBTdHJlYW0oc3RyZWFtLCAwKTsgLyogY29weSAqL1xyXG4gICAgICAgIGNvbnN0IHRhZyA9IG5ldyBBU04xVGFnKHN0cmVhbSk7XHJcbiAgICAgICAgbGV0IGxlbiA9IEFTTjEuZGVjb2RlTGVuZ3RoKHN0cmVhbSk7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBzdHJlYW0ucG9zaXRpb247XHJcbiAgICAgICAgY29uc3QgbGVuZ3RoX2hlYWRlciA9IHN0YXJ0IC0gc3RyZWFtU3RhcnQucG9zaXRpb247XHJcbiAgICAgICAgbGV0IGNoaWxkcmVuID0gbnVsbDtcclxuICAgICAgICBjb25zdCBxdWVyeV9jaGlsZHJlbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgY2hpbGRyZW4gPSBbXTtcclxuICAgICAgICAgICAgaWYgKGxlbiAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5kID0gc3RhcnQgKyBsZW47XHJcbiAgICAgICAgICAgICAgICBpZiAoZW5kID4gc3RyZWFtLmxlbmd0aCgpKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdDb250YWluZXIgYXQgb2Zmc2V0ICcgKyBzdGFydCArICcgaGFzIGEgbGVuZ3RoIG9mICcgKyBsZW4gKyAnLCB3aGljaCBpcyBwYXN0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbSc7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RyZWFtLnBvc2l0aW9uIDwgZW5kKVxyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aF0gPSBkZWNvZGUwKHN0cmVhbSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RyZWFtLnBvc2l0aW9uICE9IGVuZClcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnQ29udGVudCBzaXplIGlzIG5vdCBjb3JyZWN0IGZvciBjb250YWluZXIgYXQgb2Zmc2V0ICcgKyBzdGFydDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIHVuZGVmaW5lZCBsZW5ndGhcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IGRlY29kZTAoc3RyZWFtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMudGFnLmlzRU9DKCkpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbltjaGlsZHJlbi5sZW5ndGhdID0gcztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbGVuID0gc3RhcnQgLSBzdHJlYW0ucG9zaXRpb247IC8vIHVuZGVmaW5lZCBsZW5ndGhzIGFyZSByZXByZXNlbnRlZCBhcyBuZWdhdGl2ZSB2YWx1ZXNcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXhjZXB0aW9uIHdoaWxlIGRlY29kaW5nIHVuZGVmaW5lZCBsZW5ndGggY29udGVudCBhdCBvZmZzZXQgJyArIHN0YXJ0ICsgJzogJyArIGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIGlmICh0YWcudGFnQ29uc3RydWN0ZWQpIHtcclxuICAgICAgICAgICAgLy8gbXVzdCBoYXZlIHZhbGlkIGNvbnRlbnRcclxuICAgICAgICAgICAgcXVlcnlfY2hpbGRyZW4oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRhZy5pc1VuaXZlcnNhbCgpICYmICgodGFnLnRhZ051bWJlciA9PSAweDAzKSB8fCAodGFnLnRhZ051bWJlciA9PSAweDA0KSkpIHtcclxuICAgICAgICAgICAgLy8gc29tZXRpbWVzIEJpdFN0cmluZyBhbmQgT2N0ZXRTdHJpbmcgYXJlIHVzZWQgdG8gZW5jYXBzdWxhdGUgQVNOLjFcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICh0YWcudGFnTnVtYmVyID09IDB4MDMpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cmVhbS5nZXQoKSAhPSAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIkJJVCBTVFJJTkdzIHdpdGggdW51c2VkIGJpdHMgY2Fubm90IGVuY2Fwc3VsYXRlLlwiO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlfY2hpbGRyZW4oKTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkcmVuW2ldLnRhZy5pc0VPQygpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRU9DIGlzIG5vdCBzdXBwb3NlZCB0byBiZSBhY3R1YWwgY29udGVudC4nO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBidXQgc2lsZW50bHkgaWdub3JlIHdoZW4gdGhleSBkb24ndFxyXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgLy9ERUJVRyBjb25zb2xlLmxvZygnQ291bGQgbm90IGRlY29kZSBzdHJ1Y3R1cmUgYXQgJyArIHN0YXJ0ICsgJzonLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKGxlbiA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IFwiV2UgY2FuJ3Qgc2tpcCBvdmVyIGFuIGludmFsaWQgdGFnIHdpdGggdW5kZWZpbmVkIGxlbmd0aCBhdCBvZmZzZXQgXCIgKyBzdGFydDtcclxuICAgICAgICAgICAgc3RyZWFtLnBvc2l0aW9uID0gc3RhcnQgKyBNYXRoLmFicyhsZW4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IEFTTjEoc3RyZWFtU3RhcnQsIGxlbmd0aF9oZWFkZXIsIGxlbiwgdGFnLCBjaGlsZHJlbik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShzdHJlYW06IHN0cmluZyB8IEFycmF5QnVmZmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGRlY29kZTAobmV3IFN0cmVhbShzdHJlYW0sIDApKTtcclxuICAgIH1cclxufSIsImRlY2xhcmUgZnVuY3Rpb24gZGVmaW5lKCQpO1xyXG5kZWNsYXJlIGZ1bmN0aW9uIHVuZXNjYXBlKHN0cmluZzogc3RyaW5nKTogc3RyaW5nO1xyXG5kZWNsYXJlIGNsYXNzIF9zaGExIHtcclxuICAgIHN0YXRpYyBhcnJheUJ1ZmZlcigkOiBBcnJheUJ1ZmZlcikgOiBBcnJheUJ1ZmZlcjtcclxufVxyXG5cclxuLypcclxuaW50ZXJmYWNlIFdpbmRvdyB7XHJcbiAgICBUZXh0RW5jb2RlcjogYW55O1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgbmFtZXNwYWNlIHNoYSB7XHJcbiAgICAvKlxyXG4gICAgICogW2pzLXNoYTFde0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9lbW4xNzgvanMtc2hhMX1cclxuICAgICAqXHJcbiAgICAgKiBAdmVyc2lvbiAwLjYuMFxyXG4gICAgICogQGF1dGhvciBDaGVuLCBZaS1DeXVhbiBbZW1uMTc4QGdtYWlsLmNvbV1cclxuICAgICAqIEBjb3B5cmlnaHQgQ2hlbiwgWWktQ3l1YW4gMjAxNC0yMDE3XHJcbiAgICAgKiBAbGljZW5zZSBNSVRcclxuICAgICAqL1xyXG4gICAgLypqc2xpbnQgYml0d2lzZTogdHJ1ZSAqL1xyXG4gICAgKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICAgICAgbGV0IHJvb3Q6IGFueSA9IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDoge307XHJcbiAgICAgICAgbGV0IE5PREVfSlMgPSAhcm9vdC5KU19TSEExX05PX05PREVfSlMgJiYgdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MudmVyc2lvbnMgJiYgcHJvY2Vzcy52ZXJzaW9ucy5ub2RlO1xyXG4gICAgICAgIGlmIChOT0RFX0pTKSB7XHJcbiAgICAgICAgICAgIHJvb3QgPSBnbG9iYWw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBDT01NT05fSlMgPSAhcm9vdC5KU19TSEExX05PX0NPTU1PTl9KUyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cztcclxuICAgICAgICBsZXQgQU1EID0gdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiAoZGVmaW5lIGFzIGFueSkuYW1kO1xyXG4gICAgICAgIGxldCBIRVhfQ0hBUlMgPSAnMDEyMzQ1Njc4OWFiY2RlZicuc3BsaXQoJycpO1xyXG4gICAgICAgIGxldCBFWFRSQSA9IFstMjE0NzQ4MzY0OCwgODM4ODYwOCwgMzI3NjgsIDEyOF07XHJcbiAgICAgICAgbGV0IFNISUZUID0gWzI0LCAxNiwgOCwgMF07XHJcbiAgICAgICAgbGV0IE9VVFBVVF9UWVBFUyA9IFsnaGV4JywgJ2FycmF5JywgJ2RpZ2VzdCcsICdhcnJheUJ1ZmZlciddO1xyXG5cclxuICAgICAgICBsZXQgYmxvY2tzID0gW107XHJcblxyXG4gICAgICAgIGxldCBjcmVhdGVPdXRwdXRNZXRob2QgPSBmdW5jdGlvbiAob3V0cHV0VHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgU2hhMSh0cnVlKS51cGRhdGUobWVzc2FnZSlbb3V0cHV0VHlwZV0oKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgY3JlYXRlTWV0aG9kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBsZXQgbWV0aG9kOiBhbnkgPSBjcmVhdGVPdXRwdXRNZXRob2QoJ2hleCcpO1xyXG4gICAgICAgICAgICBpZiAoTk9ERV9KUykge1xyXG4gICAgICAgICAgICAgICAgbWV0aG9kID0gbm9kZVdyYXAobWV0aG9kKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtZXRob2QuY3JlYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyAoU2hhMSBhcyBhbnkpKCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIG1ldGhvZC51cGRhdGUgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZC5jcmVhdGUoKS51cGRhdGUobWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgT1VUUFVUX1RZUEVTLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IE9VVFBVVF9UWVBFU1tpXTtcclxuICAgICAgICAgICAgICAgIG1ldGhvZFt0eXBlXSA9IGNyZWF0ZU91dHB1dE1ldGhvZCh0eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbWV0aG9kO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBub2RlV3JhcCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcclxuICAgICAgICAgICAgdmFyIGNyeXB0byA9IGV2YWwoXCJyZXF1aXJlKCdjcnlwdG8nKVwiKTtcclxuICAgICAgICAgICAgdmFyIEJ1ZmZlciA9IGV2YWwoXCJyZXF1aXJlKCdidWZmZXInKS5CdWZmZXJcIik7XHJcbiAgICAgICAgICAgIHZhciBub2RlTWV0aG9kID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKS51cGRhdGUobWVzc2FnZSwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmNvbnN0cnVjdG9yID09PSBBcnJheUJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBuZXcgVWludDhBcnJheShtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5sZW5ndGggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QobWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKS51cGRhdGUobmV3IEJ1ZmZlcihtZXNzYWdlKSkuZGlnZXN0KCdoZXgnKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGVNZXRob2Q7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gU2hhMShzaGFyZWRNZW1vcnkpIHtcclxuICAgICAgICAgICAgaWYgKHNoYXJlZE1lbW9yeSkge1xyXG4gICAgICAgICAgICAgICAgYmxvY2tzWzBdID0gYmxvY2tzWzE2XSA9IGJsb2Nrc1sxXSA9IGJsb2Nrc1syXSA9IGJsb2Nrc1szXSA9XHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tzWzRdID0gYmxvY2tzWzVdID0gYmxvY2tzWzZdID0gYmxvY2tzWzddID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzWzhdID0gYmxvY2tzWzldID0gYmxvY2tzWzEwXSA9IGJsb2Nrc1sxMV0gPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzWzEyXSA9IGJsb2Nrc1sxM10gPSBibG9ja3NbMTRdID0gYmxvY2tzWzE1XSA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJsb2NrcyA9IGJsb2NrcztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYmxvY2tzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmgwID0gMHg2NzQ1MjMwMTtcclxuICAgICAgICAgICAgdGhpcy5oMSA9IDB4RUZDREFCODk7XHJcbiAgICAgICAgICAgIHRoaXMuaDIgPSAweDk4QkFEQ0ZFO1xyXG4gICAgICAgICAgICB0aGlzLmgzID0gMHgxMDMyNTQ3NjtcclxuICAgICAgICAgICAgdGhpcy5oNCA9IDB4QzNEMkUxRjA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJsb2NrID0gdGhpcy5zdGFydCA9IHRoaXMuYnl0ZXMgPSB0aGlzLmhCeXRlcyA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuZmluYWxpemVkID0gdGhpcy5oYXNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5maXJzdCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBTaGExLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5maW5hbGl6ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgbm90U3RyaW5nID0gdHlwZW9mKG1lc3NhZ2UpICE9PSAnc3RyaW5nJztcclxuICAgICAgICAgICAgaWYgKG5vdFN0cmluZyAmJiBtZXNzYWdlLmNvbnN0cnVjdG9yID09PSByb290LkFycmF5QnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gbmV3IFVpbnQ4QXJyYXkobWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGNvZGUsIGluZGV4ID0gMCwgaSwgbGVuZ3RoID0gbWVzc2FnZS5sZW5ndGggfHwgMCwgYmxvY2tzID0gdGhpcy5ibG9ja3M7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc2hlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tzWzBdID0gdGhpcy5ibG9jaztcclxuICAgICAgICAgICAgICAgICAgICBibG9ja3NbMTZdID0gYmxvY2tzWzFdID0gYmxvY2tzWzJdID0gYmxvY2tzWzNdID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzWzRdID0gYmxvY2tzWzVdID0gYmxvY2tzWzZdID0gYmxvY2tzWzddID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2Nrc1s4XSA9IGJsb2Nrc1s5XSA9IGJsb2Nrc1sxMF0gPSBibG9ja3NbMTFdID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbMTJdID0gYmxvY2tzWzEzXSA9IGJsb2Nrc1sxNF0gPSBibG9ja3NbMTVdID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihub3RTdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSB0aGlzLnN0YXJ0OyBpbmRleCA8IGxlbmd0aCAmJiBpIDwgNjQ7ICsraW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzW2kgPj4gMl0gfD0gbWVzc2FnZVtpbmRleF0gPDwgU0hJRlRbaSsrICYgM107XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSB0aGlzLnN0YXJ0OyBpbmRleCA8IGxlbmd0aCAmJiBpIDwgNjQ7ICsraW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IG1lc3NhZ2UuY2hhckNvZGVBdChpbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlIDwgMHg4MCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzW2kgPj4gMl0gfD0gY29kZSA8PCBTSElGVFtpKysgJiAzXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb2RlIDwgMHg4MDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2Nrc1tpID4+IDJdIHw9ICgweGMwIHwgKGNvZGUgPj4gNikpIDw8IFNISUZUW2krKyAmIDNdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tzW2kgPj4gMl0gfD0gKDB4ODAgfCAoY29kZSAmIDB4M2YpKSA8PCBTSElGVFtpKysgJiAzXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb2RlIDwgMHhkODAwIHx8IGNvZGUgPj0gMHhlMDAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbaSA+PiAyXSB8PSAoMHhlMCB8IChjb2RlID4+IDEyKSkgPDwgU0hJRlRbaSsrICYgM107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbaSA+PiAyXSB8PSAoMHg4MCB8ICgoY29kZSA+PiA2KSAmIDB4M2YpKSA8PCBTSElGVFtpKysgJiAzXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2Nrc1tpID4+IDJdIHw9ICgweDgwIHwgKGNvZGUgJiAweDNmKSkgPDwgU0hJRlRbaSsrICYgM107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gMHgxMDAwMCArICgoKGNvZGUgJiAweDNmZikgPDwgMTApIHwgKG1lc3NhZ2UuY2hhckNvZGVBdCgrK2luZGV4KSAmIDB4M2ZmKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbaSA+PiAyXSB8PSAoMHhmMCB8IChjb2RlID4+IDE4KSkgPDwgU0hJRlRbaSsrICYgM107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbaSA+PiAyXSB8PSAoMHg4MCB8ICgoY29kZSA+PiAxMikgJiAweDNmKSkgPDwgU0hJRlRbaSsrICYgM107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbaSA+PiAyXSB8PSAoMHg4MCB8ICgoY29kZSA+PiA2KSAmIDB4M2YpKSA8PCBTSElGVFtpKysgJiAzXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2Nrc1tpID4+IDJdIHw9ICgweDgwIHwgKGNvZGUgJiAweDNmKSkgPDwgU0hJRlRbaSsrICYgM107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0Qnl0ZUluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnl0ZXMgKz0gaSAtIHRoaXMuc3RhcnQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA+PSA2NCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmxvY2sgPSBibG9ja3NbMTZdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBpIC0gNjQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNoKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gaTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5ieXRlcyA+IDQyOTQ5NjcyOTUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaEJ5dGVzICs9IHRoaXMuYnl0ZXMgLyA0Mjk0OTY3Mjk2IDw8IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ5dGVzID0gdGhpcy5ieXRlcyAlIDQyOTQ5NjcyOTY7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgU2hhMS5wcm90b3R5cGUuZmluYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmZpbmFsaXplZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdmFyIGJsb2NrcyA9IHRoaXMuYmxvY2tzLCBpID0gdGhpcy5sYXN0Qnl0ZUluZGV4O1xyXG4gICAgICAgICAgICBibG9ja3NbMTZdID0gdGhpcy5ibG9jaztcclxuICAgICAgICAgICAgYmxvY2tzW2kgPj4gMl0gfD0gRVhUUkFbaSAmIDNdO1xyXG4gICAgICAgICAgICB0aGlzLmJsb2NrID0gYmxvY2tzWzE2XTtcclxuICAgICAgICAgICAgaWYgKGkgPj0gNTYpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNoZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc2goKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJsb2Nrc1swXSA9IHRoaXMuYmxvY2s7XHJcbiAgICAgICAgICAgICAgICBibG9ja3NbMTZdID0gYmxvY2tzWzFdID0gYmxvY2tzWzJdID0gYmxvY2tzWzNdID1cclxuICAgICAgICAgICAgICAgICAgICBibG9ja3NbNF0gPSBibG9ja3NbNV0gPSBibG9ja3NbNl0gPSBibG9ja3NbN10gPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbOF0gPSBibG9ja3NbOV0gPSBibG9ja3NbMTBdID0gYmxvY2tzWzExXSA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja3NbMTJdID0gYmxvY2tzWzEzXSA9IGJsb2Nrc1sxNF0gPSBibG9ja3NbMTVdID0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBibG9ja3NbMTRdID0gdGhpcy5oQnl0ZXMgPDwgMyB8IHRoaXMuYnl0ZXMgPj4+IDI5O1xyXG4gICAgICAgICAgICBibG9ja3NbMTVdID0gdGhpcy5ieXRlcyA8PCAzO1xyXG4gICAgICAgICAgICB0aGlzLmhhc2goKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBTaGExLnByb3RvdHlwZS5oYXNoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgYSA9IHRoaXMuaDAsIGIgPSB0aGlzLmgxLCBjID0gdGhpcy5oMiwgZCA9IHRoaXMuaDMsIGUgPSB0aGlzLmg0O1xyXG4gICAgICAgICAgICB2YXIgZiwgaiwgdCwgYmxvY2tzID0gdGhpcy5ibG9ja3M7XHJcblxyXG4gICAgICAgICAgICBmb3IoaiA9IDE2OyBqIDwgODA7ICsraikge1xyXG4gICAgICAgICAgICAgICAgdCA9IGJsb2Nrc1tqIC0gM10gXiBibG9ja3NbaiAtIDhdIF4gYmxvY2tzW2ogLSAxNF0gXiBibG9ja3NbaiAtIDE2XTtcclxuICAgICAgICAgICAgICAgIGJsb2Nrc1tqXSA9ICAodCA8PCAxKSB8ICh0ID4+PiAzMSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvcihqID0gMDsgaiA8IDIwOyBqICs9IDUpIHtcclxuICAgICAgICAgICAgICAgIGYgPSAoYiAmIGMpIHwgKCh+YikgJiBkKTtcclxuICAgICAgICAgICAgICAgIHQgPSAoYSA8PCA1KSB8IChhID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBlID0gdCArIGYgKyBlICsgMTUxODUwMDI0OSArIGJsb2Nrc1tqXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgYiA9IChiIDw8IDMwKSB8IChiID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gKGEgJiBiKSB8ICgofmEpICYgYyk7XHJcbiAgICAgICAgICAgICAgICB0ID0gKGUgPDwgNSkgfCAoZSA+Pj4gMjcpO1xyXG4gICAgICAgICAgICAgICAgZCA9IHQgKyBmICsgZCArIDE1MTg1MDAyNDkgKyBibG9ja3NbaiArIDFdIDw8IDA7XHJcbiAgICAgICAgICAgICAgICBhID0gKGEgPDwgMzApIHwgKGEgPj4+IDIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGYgPSAoZSAmIGEpIHwgKCh+ZSkgJiBiKTtcclxuICAgICAgICAgICAgICAgIHQgPSAoZCA8PCA1KSB8IChkID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBjID0gdCArIGYgKyBjICsgMTUxODUwMDI0OSArIGJsb2Nrc1tqICsgMl0gPDwgMDtcclxuICAgICAgICAgICAgICAgIGUgPSAoZSA8PCAzMCkgfCAoZSA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IChkICYgZSkgfCAoKH5kKSAmIGEpO1xyXG4gICAgICAgICAgICAgICAgdCA9IChjIDw8IDUpIHwgKGMgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGIgPSB0ICsgZiArIGIgKyAxNTE4NTAwMjQ5ICsgYmxvY2tzW2ogKyAzXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgZCA9IChkIDw8IDMwKSB8IChkID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gKGMgJiBkKSB8ICgofmMpICYgZSk7XHJcbiAgICAgICAgICAgICAgICB0ID0gKGIgPDwgNSkgfCAoYiA+Pj4gMjcpO1xyXG4gICAgICAgICAgICAgICAgYSA9IHQgKyBmICsgYSArIDE1MTg1MDAyNDkgKyBibG9ja3NbaiArIDRdIDw8IDA7XHJcbiAgICAgICAgICAgICAgICBjID0gKGMgPDwgMzApIHwgKGMgPj4+IDIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IoOyBqIDwgNDA7IGogKz0gNSkge1xyXG4gICAgICAgICAgICAgICAgZiA9IGIgXiBjIF4gZDtcclxuICAgICAgICAgICAgICAgIHQgPSAoYSA8PCA1KSB8IChhID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBlID0gdCArIGYgKyBlICsgMTg1OTc3NTM5MyArIGJsb2Nrc1tqXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgYiA9IChiIDw8IDMwKSB8IChiID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gYSBeIGIgXiBjO1xyXG4gICAgICAgICAgICAgICAgdCA9IChlIDw8IDUpIHwgKGUgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGQgPSB0ICsgZiArIGQgKyAxODU5Nzc1MzkzICsgYmxvY2tzW2ogKyAxXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgYSA9IChhIDw8IDMwKSB8IChhID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gZSBeIGEgXiBiO1xyXG4gICAgICAgICAgICAgICAgdCA9IChkIDw8IDUpIHwgKGQgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGMgPSB0ICsgZiArIGMgKyAxODU5Nzc1MzkzICsgYmxvY2tzW2ogKyAyXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgZSA9IChlIDw8IDMwKSB8IChlID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gZCBeIGUgXiBhO1xyXG4gICAgICAgICAgICAgICAgdCA9IChjIDw8IDUpIHwgKGMgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGIgPSB0ICsgZiArIGIgKyAxODU5Nzc1MzkzICsgYmxvY2tzW2ogKyAzXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgZCA9IChkIDw8IDMwKSB8IChkID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gYyBeIGQgXiBlO1xyXG4gICAgICAgICAgICAgICAgdCA9IChiIDw8IDUpIHwgKGIgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGEgPSB0ICsgZiArIGEgKyAxODU5Nzc1MzkzICsgYmxvY2tzW2ogKyA0XSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgYyA9IChjIDw8IDMwKSB8IChjID4+PiAyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yKDsgaiA8IDYwOyBqICs9IDUpIHtcclxuICAgICAgICAgICAgICAgIGYgPSAoYiAmIGMpIHwgKGIgJiBkKSB8IChjICYgZCk7XHJcbiAgICAgICAgICAgICAgICB0ID0gKGEgPDwgNSkgfCAoYSA+Pj4gMjcpO1xyXG4gICAgICAgICAgICAgICAgZSA9IHQgKyBmICsgZSAtIDE4OTQwMDc1ODggKyBibG9ja3Nbal0gPDwgMDtcclxuICAgICAgICAgICAgICAgIGIgPSAoYiA8PCAzMCkgfCAoYiA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IChhICYgYikgfCAoYSAmIGMpIHwgKGIgJiBjKTtcclxuICAgICAgICAgICAgICAgIHQgPSAoZSA8PCA1KSB8IChlID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBkID0gdCArIGYgKyBkIC0gMTg5NDAwNzU4OCArIGJsb2Nrc1tqICsgMV0gPDwgMDtcclxuICAgICAgICAgICAgICAgIGEgPSAoYSA8PCAzMCkgfCAoYSA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IChlICYgYSkgfCAoZSAmIGIpIHwgKGEgJiBiKTtcclxuICAgICAgICAgICAgICAgIHQgPSAoZCA8PCA1KSB8IChkID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBjID0gdCArIGYgKyBjIC0gMTg5NDAwNzU4OCArIGJsb2Nrc1tqICsgMl0gPDwgMDtcclxuICAgICAgICAgICAgICAgIGUgPSAoZSA8PCAzMCkgfCAoZSA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IChkICYgZSkgfCAoZCAmIGEpIHwgKGUgJiBhKTtcclxuICAgICAgICAgICAgICAgIHQgPSAoYyA8PCA1KSB8IChjID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBiID0gdCArIGYgKyBiIC0gMTg5NDAwNzU4OCArIGJsb2Nrc1tqICsgM10gPDwgMDtcclxuICAgICAgICAgICAgICAgIGQgPSAoZCA8PCAzMCkgfCAoZCA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IChjICYgZCkgfCAoYyAmIGUpIHwgKGQgJiBlKTtcclxuICAgICAgICAgICAgICAgIHQgPSAoYiA8PCA1KSB8IChiID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBhID0gdCArIGYgKyBhIC0gMTg5NDAwNzU4OCArIGJsb2Nrc1tqICsgNF0gPDwgMDtcclxuICAgICAgICAgICAgICAgIGMgPSAoYyA8PCAzMCkgfCAoYyA+Pj4gMik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvcig7IGogPCA4MDsgaiArPSA1KSB7XHJcbiAgICAgICAgICAgICAgICBmID0gYiBeIGMgXiBkO1xyXG4gICAgICAgICAgICAgICAgdCA9IChhIDw8IDUpIHwgKGEgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGUgPSB0ICsgZiArIGUgLSA4OTk0OTc1MTQgKyBibG9ja3Nbal0gPDwgMDtcclxuICAgICAgICAgICAgICAgIGIgPSAoYiA8PCAzMCkgfCAoYiA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IGEgXiBiIF4gYztcclxuICAgICAgICAgICAgICAgIHQgPSAoZSA8PCA1KSB8IChlID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBkID0gdCArIGYgKyBkIC0gODk5NDk3NTE0ICsgYmxvY2tzW2ogKyAxXSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgYSA9IChhIDw8IDMwKSB8IChhID4+PiAyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmID0gZSBeIGEgXiBiO1xyXG4gICAgICAgICAgICAgICAgdCA9IChkIDw8IDUpIHwgKGQgPj4+IDI3KTtcclxuICAgICAgICAgICAgICAgIGMgPSB0ICsgZiArIGMgLSA4OTk0OTc1MTQgKyBibG9ja3NbaiArIDJdIDw8IDA7XHJcbiAgICAgICAgICAgICAgICBlID0gKGUgPDwgMzApIHwgKGUgPj4+IDIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGYgPSBkIF4gZSBeIGE7XHJcbiAgICAgICAgICAgICAgICB0ID0gKGMgPDwgNSkgfCAoYyA+Pj4gMjcpO1xyXG4gICAgICAgICAgICAgICAgYiA9IHQgKyBmICsgYiAtIDg5OTQ5NzUxNCArIGJsb2Nrc1tqICsgM10gPDwgMDtcclxuICAgICAgICAgICAgICAgIGQgPSAoZCA8PCAzMCkgfCAoZCA+Pj4gMik7XHJcblxyXG4gICAgICAgICAgICAgICAgZiA9IGMgXiBkIF4gZTtcclxuICAgICAgICAgICAgICAgIHQgPSAoYiA8PCA1KSB8IChiID4+PiAyNyk7XHJcbiAgICAgICAgICAgICAgICBhID0gdCArIGYgKyBhIC0gODk5NDk3NTE0ICsgYmxvY2tzW2ogKyA0XSA8PCAwO1xyXG4gICAgICAgICAgICAgICAgYyA9IChjIDw8IDMwKSB8IChjID4+PiAyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5oMCA9IHRoaXMuaDAgKyBhIDw8IDA7XHJcbiAgICAgICAgICAgIHRoaXMuaDEgPSB0aGlzLmgxICsgYiA8PCAwO1xyXG4gICAgICAgICAgICB0aGlzLmgyID0gdGhpcy5oMiArIGMgPDwgMDtcclxuICAgICAgICAgICAgdGhpcy5oMyA9IHRoaXMuaDMgKyBkIDw8IDA7XHJcbiAgICAgICAgICAgIHRoaXMuaDQgPSB0aGlzLmg0ICsgZSA8PCAwO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFNoYTEucHJvdG90eXBlLmhleCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5maW5hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGgwID0gdGhpcy5oMCwgaDEgPSB0aGlzLmgxLCBoMiA9IHRoaXMuaDIsIGgzID0gdGhpcy5oMywgaDQgPSB0aGlzLmg0O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIEhFWF9DSEFSU1soaDAgPj4gMjgpICYgMHgwRl0gKyBIRVhfQ0hBUlNbKGgwID4+IDI0KSAmIDB4MEZdICtcclxuICAgICAgICAgICAgICAgIEhFWF9DSEFSU1soaDAgPj4gMjApICYgMHgwRl0gKyBIRVhfQ0hBUlNbKGgwID4+IDE2KSAmIDB4MEZdICtcclxuICAgICAgICAgICAgICAgIEhFWF9DSEFSU1soaDAgPj4gMTIpICYgMHgwRl0gKyBIRVhfQ0hBUlNbKGgwID4+IDgpICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoMCA+PiA0KSAmIDB4MEZdICsgSEVYX0NIQVJTW2gwICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoMSA+PiAyOCkgJiAweDBGXSArIEhFWF9DSEFSU1soaDEgPj4gMjQpICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoMSA+PiAyMCkgJiAweDBGXSArIEhFWF9DSEFSU1soaDEgPj4gMTYpICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoMSA+PiAxMikgJiAweDBGXSArIEhFWF9DSEFSU1soaDEgPj4gOCkgJiAweDBGXSArXHJcbiAgICAgICAgICAgICAgICBIRVhfQ0hBUlNbKGgxID4+IDQpICYgMHgwRl0gKyBIRVhfQ0hBUlNbaDEgJiAweDBGXSArXHJcbiAgICAgICAgICAgICAgICBIRVhfQ0hBUlNbKGgyID4+IDI4KSAmIDB4MEZdICsgSEVYX0NIQVJTWyhoMiA+PiAyNCkgJiAweDBGXSArXHJcbiAgICAgICAgICAgICAgICBIRVhfQ0hBUlNbKGgyID4+IDIwKSAmIDB4MEZdICsgSEVYX0NIQVJTWyhoMiA+PiAxNikgJiAweDBGXSArXHJcbiAgICAgICAgICAgICAgICBIRVhfQ0hBUlNbKGgyID4+IDEyKSAmIDB4MEZdICsgSEVYX0NIQVJTWyhoMiA+PiA4KSAmIDB4MEZdICtcclxuICAgICAgICAgICAgICAgIEhFWF9DSEFSU1soaDIgPj4gNCkgJiAweDBGXSArIEhFWF9DSEFSU1toMiAmIDB4MEZdICtcclxuICAgICAgICAgICAgICAgIEhFWF9DSEFSU1soaDMgPj4gMjgpICYgMHgwRl0gKyBIRVhfQ0hBUlNbKGgzID4+IDI0KSAmIDB4MEZdICtcclxuICAgICAgICAgICAgICAgIEhFWF9DSEFSU1soaDMgPj4gMjApICYgMHgwRl0gKyBIRVhfQ0hBUlNbKGgzID4+IDE2KSAmIDB4MEZdICtcclxuICAgICAgICAgICAgICAgIEhFWF9DSEFSU1soaDMgPj4gMTIpICYgMHgwRl0gKyBIRVhfQ0hBUlNbKGgzID4+IDgpICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoMyA+PiA0KSAmIDB4MEZdICsgSEVYX0NIQVJTW2gzICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoNCA+PiAyOCkgJiAweDBGXSArIEhFWF9DSEFSU1soaDQgPj4gMjQpICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoNCA+PiAyMCkgJiAweDBGXSArIEhFWF9DSEFSU1soaDQgPj4gMTYpICYgMHgwRl0gK1xyXG4gICAgICAgICAgICAgICAgSEVYX0NIQVJTWyhoNCA+PiAxMikgJiAweDBGXSArIEhFWF9DSEFSU1soaDQgPj4gOCkgJiAweDBGXSArXHJcbiAgICAgICAgICAgICAgICBIRVhfQ0hBUlNbKGg0ID4+IDQpICYgMHgwRl0gKyBIRVhfQ0hBUlNbaDQgJiAweDBGXTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBTaGExLnByb3RvdHlwZS50b1N0cmluZyA9IFNoYTEucHJvdG90eXBlLmhleDtcclxuXHJcbiAgICAgICAgU2hhMS5wcm90b3R5cGUuZGlnZXN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbmFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgaDAgPSB0aGlzLmgwLCBoMSA9IHRoaXMuaDEsIGgyID0gdGhpcy5oMiwgaDMgPSB0aGlzLmgzLCBoNCA9IHRoaXMuaDQ7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAgICAgKGgwID4+IDI0KSAmIDB4RkYsIChoMCA+PiAxNikgJiAweEZGLCAoaDAgPj4gOCkgJiAweEZGLCBoMCAmIDB4RkYsXHJcbiAgICAgICAgICAgICAgICAoaDEgPj4gMjQpICYgMHhGRiwgKGgxID4+IDE2KSAmIDB4RkYsIChoMSA+PiA4KSAmIDB4RkYsIGgxICYgMHhGRixcclxuICAgICAgICAgICAgICAgIChoMiA+PiAyNCkgJiAweEZGLCAoaDIgPj4gMTYpICYgMHhGRiwgKGgyID4+IDgpICYgMHhGRiwgaDIgJiAweEZGLFxyXG4gICAgICAgICAgICAgICAgKGgzID4+IDI0KSAmIDB4RkYsIChoMyA+PiAxNikgJiAweEZGLCAoaDMgPj4gOCkgJiAweEZGLCBoMyAmIDB4RkYsXHJcbiAgICAgICAgICAgICAgICAoaDQgPj4gMjQpICYgMHhGRiwgKGg0ID4+IDE2KSAmIDB4RkYsIChoNCA+PiA4KSAmIDB4RkYsIGg0ICYgMHhGRlxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFNoYTEucHJvdG90eXBlLmFycmF5ID0gU2hhMS5wcm90b3R5cGUuZGlnZXN0O1xyXG5cclxuICAgICAgICBTaGExLnByb3RvdHlwZS5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5maW5hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigyMCk7XHJcbiAgICAgICAgICAgIHZhciBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xyXG4gICAgICAgICAgICBkYXRhVmlldy5zZXRVaW50MzIoMCwgdGhpcy5oMCk7XHJcbiAgICAgICAgICAgIGRhdGFWaWV3LnNldFVpbnQzMig0LCB0aGlzLmgxKTtcclxuICAgICAgICAgICAgZGF0YVZpZXcuc2V0VWludDMyKDgsIHRoaXMuaDIpO1xyXG4gICAgICAgICAgICBkYXRhVmlldy5zZXRVaW50MzIoMTIsIHRoaXMuaDMpO1xyXG4gICAgICAgICAgICBkYXRhVmlldy5zZXRVaW50MzIoMTYsIHRoaXMuaDQpO1xyXG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBleHBvcnRzID0gY3JlYXRlTWV0aG9kKCk7XHJcblxyXG4gICAgICAgIGlmIChDT01NT05fSlMpIHtcclxuICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJvb3QuX3NoYTEgPSBleHBvcnRzO1xyXG4gICAgICAgICAgICBpZiAoQU1EKSB7XHJcbiAgICAgICAgICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBleHBvcnRzO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBlbmNvZGVfdGV4dChidWZmZXI6IHN0cmluZykgOiBBcnJheUJ1ZmZlciB7XHJcbiAgICAgICAgaWYgKCh3aW5kb3cgYXMgYW55KS5UZXh0RW5jb2Rlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGJ1ZmZlcikuYnVmZmVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgdXRmOCA9IHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChidWZmZXIpKTtcclxuICAgICAgICBsZXQgcmVzdWx0ID0gbmV3IFVpbnQ4QXJyYXkodXRmOC5sZW5ndGgpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXRmOC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICByZXN1bHRbaV0gPSB1dGY4LmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQuYnVmZmVyO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNoYTEobWVzc2FnZTogc3RyaW5nIHwgQXJyYXlCdWZmZXIpIDogUHJvbWlzZUxpa2U8QXJyYXlCdWZmZXI+IHtcclxuICAgICAgICBpZighKHR5cGVvZihtZXNzYWdlKSA9PT0gXCJzdHJpbmdcIiB8fCBtZXNzYWdlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpKSB0aHJvdyBcIkludmFsaWQgdHlwZSFcIjtcclxuXHJcbiAgICAgICAgbGV0IGJ1ZmZlciA9IG1lc3NhZ2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciA/IG1lc3NhZ2UgOiBlbmNvZGVfdGV4dChtZXNzYWdlIGFzIHN0cmluZyk7XHJcblxyXG4gICAgICAgIGlmKCFjcnlwdG8gfHwgIWNyeXB0by5zdWJ0bGUgfHwgIWNyeXB0by5zdWJ0bGUuZGlnZXN0IHx8IC9FZGdlLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8QXJyYXlCdWZmZXI+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShfc2hhMS5hcnJheUJ1ZmZlcihidWZmZXIgYXMgQXJyYXlCdWZmZXIpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMVwiLCBidWZmZXIpO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBmdW5jdGlvbiBndWlkKCkge1xyXG4gICAgZnVuY3Rpb24gczQoKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXHJcbiAgICAgICAgICAgIC50b1N0cmluZygxNilcclxuICAgICAgICAgICAgLnN1YnN0cmluZygxKTtcclxuICAgIH1cclxuICAgIHJldHVybiBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcclxufSIsImltcG9ydCB7Z3VpZH0gZnJvbSBcIi4uL2NyeXB0by91aWRcIjtcclxuaW1wb3J0IHtsb2csIExvZ0NhdGVnb3J5fSBmcm9tIFwiLi4vbG9nXCI7XHJcbmltcG9ydCB7TWVzc2FnZUhlbHBlcn0gZnJvbSBcIi4uL3VpL2ZyYW1lcy9jaGF0XCI7XHJcbmltcG9ydCB7U3RhdGljU2V0dGluZ3N9IGZyb20gXCIuLi9zZXR0aW5nc1wiO1xyXG5pbXBvcnQge2NyZWF0ZUVycm9yTW9kYWx9IGZyb20gXCIuLi91aS9lbGVtZW50cy9tb2RhbFwiO1xyXG5cclxuZXhwb3J0IG5hbWVzcGFjZSBpMThuIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRpb25LZXkge1xyXG4gICAgICAgIG1lc3NhZ2U6IHN0cmluZztcclxuICAgICAgICBsaW5lPzogbnVtYmVyO1xyXG4gICAgICAgIGNoYXJhY3Rlcj86IG51bWJlcjtcclxuICAgICAgICBmaWxlbmFtZT86IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIFRyYW5zbGF0aW9uIHtcclxuICAgICAgICBrZXk6IFRyYW5zbGF0aW9uS2V5O1xyXG4gICAgICAgIHRyYW5zbGF0ZWQ6IHN0cmluZztcclxuICAgICAgICBmbGFncz86IHN0cmluZ1tdO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29udHJpYnV0b3Ige1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRpb25GaWxlIHtcclxuICAgICAgICBwYXRoOiBzdHJpbmc7XHJcbiAgICAgICAgZnVsbF91cmw6IHN0cmluZztcclxuXHJcbiAgICAgICAgdHJhbnNsYXRpb25zOiBUcmFuc2xhdGlvbltdO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVwb3NpdG9yeVRyYW5zbGF0aW9uIHtcclxuICAgICAgICBrZXk6IHN0cmluZztcclxuICAgICAgICBwYXRoOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGNvdW50cnlfY29kZTogc3RyaW5nO1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICBjb250cmlidXRvcnM6IENvbnRyaWJ1dG9yW107XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRpb25SZXBvc2l0b3J5IHtcclxuICAgICAgICB1bmlxdWVfaWQ6IHN0cmluZztcclxuICAgICAgICB1cmw6IHN0cmluZztcclxuICAgICAgICBuYW1lPzogc3RyaW5nO1xyXG4gICAgICAgIGNvbnRhY3Q/OiBzdHJpbmc7XHJcbiAgICAgICAgdHJhbnNsYXRpb25zPzogUmVwb3NpdG9yeVRyYW5zbGF0aW9uW107XHJcbiAgICAgICAgbG9hZF90aW1lc3RhbXA/OiBudW1iZXI7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGxldCB0cmFuc2xhdGlvbnM6IFRyYW5zbGF0aW9uW10gPSBbXTtcclxuICAgIGxldCBmYXN0X3RyYW5zbGF0ZTogeyBba2V5OnN0cmluZ106c3RyaW5nOyB9ID0ge307XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdHIobWVzc2FnZTogc3RyaW5nLCBrZXk/OiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBzbG9wcHkgPSBmYXN0X3RyYW5zbGF0ZVttZXNzYWdlXTtcclxuICAgICAgICBpZihzbG9wcHkpIHJldHVybiBzbG9wcHk7XHJcblxyXG4gICAgICAgIGxvZy5pbmZvKExvZ0NhdGVnb3J5LkkxOE4sIFwiVHJhbnNsYXRpbmcgXFxcIiVzXFxcIi4gRGVmYXVsdDogXFxcIiVzXFxcIlwiLCBrZXksIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICBsZXQgdHJhbnNsYXRlZCA9IG1lc3NhZ2U7XHJcbiAgICAgICAgZm9yKGNvbnN0IHRyYW5zbGF0aW9uIG9mIHRyYW5zbGF0aW9ucykge1xyXG4gICAgICAgICAgICBpZih0cmFuc2xhdGlvbi5rZXkubWVzc2FnZSA9PSBtZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGVkID0gdHJhbnNsYXRpb24udHJhbnNsYXRlZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmYXN0X3RyYW5zbGF0ZVttZXNzYWdlXSA9IHRyYW5zbGF0ZWQ7XHJcbiAgICAgICAgcmV0dXJuIHRyYW5zbGF0ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHRyYShtZXNzYWdlOiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKSB7XHJcbiAgICAgICAgbWVzc2FnZSA9IHRyKG1lc3NhZ2UpO1xyXG4gICAgICAgIHJldHVybiBNZXNzYWdlSGVscGVyLmZvcm1hdE1lc3NhZ2UobWVzc2FnZSwgLi4uYXJncyk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZF90cmFuc2xhdGlvbl9maWxlKHVybDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIDogUHJvbWlzZTxUcmFuc2xhdGlvbkZpbGU+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VHJhbnNsYXRpb25GaWxlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogcmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gKHR5cGVvZihyZXN1bHQpID09PSBcInN0cmluZ1wiID8gSlNPTi5wYXJzZShyZXN1bHQpIDogcmVzdWx0KSBhcyBUcmFuc2xhdGlvbkZpbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoXCJJbnZhbGlkIGpzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUuZnVsbF91cmwgPSB1cmw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUucGF0aCA9IHBhdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IFZhbGlkYXRlIGZpbGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LkkxOE4sIHRyKFwiRmFpbGVkIHRvIGxvYWQgdHJhbnNsYXRpb24gZmlsZSAlcy4gRmFpbGVkIHRvIHBhcnNlIG9yIHByb2Nlc3MganNvbjogJW9cIiksIHVybCwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QodHIoXCJGYWlsZWQgdG8gcHJvY2VzcyBvciBwYXJzZSBqc29uIVwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh0cihcIkZhaWxlZCB0byBsb2FkIGZpbGU6IFwiKSArIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbG9hZF9maWxlKHVybDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIGxvYWRfdHJhbnNsYXRpb25fZmlsZSh1cmwsIHBhdGgpLnRoZW4oYXN5bmMgcmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgLyogVE9ETzogSW1wcm92ZSB0aGlzIHRlc3Q/ISovXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0cihcIkR1bW15IHRyYW5zbGF0aW9uIHRlc3RcIik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IFwiZHVtbXkgdGVzdCBmYWlsZWRcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuSTE4TiwgdHIoXCJTdWNjZXNzZnVsbHkgaW5pdGlhbGl6ZWQgdXAgdHJhbnNsYXRpb24gZmlsZSBmcm9tICVzXCIpLCB1cmwpO1xyXG4gICAgICAgICAgICB0cmFuc2xhdGlvbnMgPSByZXN1bHQudHJhbnNsYXRpb25zO1xyXG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuSTE4TiwgdHIoXCJGYWlsZWQgdG8gbG9hZCB0cmFuc2xhdGlvbiBmaWxlIGZyb20gXFxcIiVzXFxcIi4gRXJyb3I6ICVvXCIpLCB1cmwsIGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkX3JlcG9zaXRvcnkwKHJlcG86IFRyYW5zbGF0aW9uUmVwb3NpdG9yeSwgcmVsb2FkOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYoIXJlcG8ubG9hZF90aW1lc3RhbXAgfHwgcmVwby5sb2FkX3RpbWVzdGFtcCA8IDEwMDAgfHwgcmVsb2FkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm9fanNvbiA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiByZXBvLnVybCArIFwiL2luZm8uanNvblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlOiAhcmVsb2FkLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSAodHlwZW9mKHJlc3VsdCkgPT09IFwic3RyaW5nXCIgPyBKU09OLnBhcnNlKHJlc3VsdCkgOiByZXN1bHQpIGFzIFRyYW5zbGF0aW9uRmlsZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChcIkludmFsaWQganNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QodHIoXCJGYWlsZWQgdG8gbG9hZCBmaWxlOiBcIikgKyBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHJlcG8sIGluZm9fanNvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZighcmVwby51bmlxdWVfaWQpXHJcbiAgICAgICAgICAgIHJlcG8udW5pcXVlX2lkID0gZ3VpZCgpO1xyXG5cclxuICAgICAgICByZXBvLnRyYW5zbGF0aW9ucyA9IHJlcG8udHJhbnNsYXRpb25zIHx8IFtdO1xyXG4gICAgICAgIHJlcG8ubG9hZF90aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkX3JlcG9zaXRvcnkodXJsOiBzdHJpbmcpIDogUHJvbWlzZTxUcmFuc2xhdGlvblJlcG9zaXRvcnk+IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB7fSBhcyBUcmFuc2xhdGlvblJlcG9zaXRvcnk7XHJcbiAgICAgICAgcmVzdWx0LnVybCA9IHVybDtcclxuICAgICAgICBhd2FpdCBsb2FkX3JlcG9zaXRvcnkwKHJlc3VsdCwgZmFsc2UpO1xyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IG5hbWVzcGFjZSBjb25maWcge1xyXG4gICAgICAgIGV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRpb25Db25maWcge1xyXG4gICAgICAgICAgICBjdXJyZW50X3JlcG9zaXRvcnlfdXJsPzogc3RyaW5nO1xyXG4gICAgICAgICAgICBjdXJyZW50X2xhbmd1YWdlPzogc3RyaW5nO1xyXG5cclxuICAgICAgICAgICAgY3VycmVudF90cmFuc2xhdGlvbl91cmw/OiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGN1cnJlbnRfdHJhbnNsYXRpb25fcGF0aD86IHN0cmluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydCBpbnRlcmZhY2UgUmVwb3NpdG9yeUNvbmZpZyB7XHJcbiAgICAgICAgICAgIHJlcG9zaXRvcmllcz86IHtcclxuICAgICAgICAgICAgICAgIHVybD86IHN0cmluZztcclxuICAgICAgICAgICAgICAgIHJlcG9zaXRvcnk/OiBUcmFuc2xhdGlvblJlcG9zaXRvcnk7XHJcbiAgICAgICAgICAgIH1bXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJlcG9zaXRvcnlfY29uZmlnX2tleSA9IFwiaTE4bi5yZXBvc2l0b3J5XCI7XHJcbiAgICAgICAgbGV0IF9jYWNoZWRfcmVwb3NpdG9yeV9jb25maWc6IFJlcG9zaXRvcnlDb25maWc7XHJcbiAgICAgICAgZXhwb3J0IGZ1bmN0aW9uIHJlcG9zaXRvcnlfY29uZmlnKCkge1xyXG4gICAgICAgICAgICBpZihfY2FjaGVkX3JlcG9zaXRvcnlfY29uZmlnKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jYWNoZWRfcmVwb3NpdG9yeV9jb25maWc7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb25maWdfc3RyaW5nID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0ocmVwb3NpdG9yeV9jb25maWdfa2V5KTtcclxuICAgICAgICAgICAgbGV0IGNvbmZpZzogUmVwb3NpdG9yeUNvbmZpZztcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZ19zdHJpbmcgPyBKU09OLnBhcnNlKGNvbmZpZ19zdHJpbmcpIDoge307XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5JMThOLCB0cihcIkZhaWxlZCB0byBwYXJzZSByZXBvc2l0b3J5IGNvbmZpZzogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25maWcucmVwb3NpdG9yaWVzID0gY29uZmlnLnJlcG9zaXRvcmllcyB8fCBbXTtcclxuICAgICAgICAgICAgZm9yKGNvbnN0IHJlcG8gb2YgY29uZmlnLnJlcG9zaXRvcmllcylcclxuICAgICAgICAgICAgICAgIChyZXBvLnJlcG9zaXRvcnkgfHwge2xvYWRfdGltZXN0YW1wOiAwfSkubG9hZF90aW1lc3RhbXAgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYoY29uZmlnLnJlcG9zaXRvcmllcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy9BZGQgdGhlIGRlZmF1bHQgVGVhU3BlYWsgcmVwb3NpdG9yeVxyXG4gICAgICAgICAgICAgICAgbG9hZF9yZXBvc2l0b3J5KFN0YXRpY1NldHRpbmdzLmluc3RhbmNlLnN0YXRpYyhcImkxOG4uZGVmYXVsdF9yZXBvc2l0b3J5XCIsIFwiaHR0cHM6Ly93ZWIudGVhc3BlYWsuZGUvaTE4bi9cIikpLnRoZW4ocmVwbyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuSTE4TiwgdHIoXCJTdWNjZXNzZnVsbHkgYWRkZWQgZGVmYXVsdCByZXBvc2l0b3J5IGZyb20gXFxcIiVzXFxcIi5cIiksIHJlcG8udXJsKTtcclxuICAgICAgICAgICAgICAgICAgICByZWdpc3Rlcl9yZXBvc2l0b3J5KHJlcG8pO1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LkkxOE4sIHRyKFwiRmFpbGVkIHRvIGFkZCBkZWZhdWx0IHJlcG9zaXRvcnkuIEVycm9yOiAlb1wiKSwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBfY2FjaGVkX3JlcG9zaXRvcnlfY29uZmlnID0gY29uZmlnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0IGZ1bmN0aW9uIHNhdmVfcmVwb3NpdG9yeV9jb25maWcoKSB7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHJlcG9zaXRvcnlfY29uZmlnX2tleSwgSlNPTi5zdHJpbmdpZnkoX2NhY2hlZF9yZXBvc2l0b3J5X2NvbmZpZykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNsYXRpb25fY29uZmlnX2tleSA9IFwiaTE4bi50cmFuc2xhdGlvblwiO1xyXG4gICAgICAgIGxldCBfY2FjaGVkX3RyYW5zbGF0aW9uX2NvbmZpZzogVHJhbnNsYXRpb25Db25maWc7XHJcblxyXG4gICAgICAgIGV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGlvbl9jb25maWcoKSA6IFRyYW5zbGF0aW9uQ29uZmlnIHtcclxuICAgICAgICAgICAgaWYoX2NhY2hlZF90cmFuc2xhdGlvbl9jb25maWcpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gX2NhY2hlZF90cmFuc2xhdGlvbl9jb25maWc7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb25maWdfc3RyaW5nID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0odHJhbnNsYXRpb25fY29uZmlnX2tleSk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBfY2FjaGVkX3RyYW5zbGF0aW9uX2NvbmZpZyA9IGNvbmZpZ19zdHJpbmcgPyBKU09OLnBhcnNlKGNvbmZpZ19zdHJpbmcpIDoge307XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5JMThOLCB0cihcIkZhaWxlZCB0byBpbml0aWFsaXplIHRyYW5zbGF0aW9uIGNvbmZpZy4gVXNpbmcgZGVmYXVsdCBvbmUuIEVycm9yOiAlb1wiKSwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgX2NhY2hlZF90cmFuc2xhdGlvbl9jb25maWcgPSB7fSBhcyBhbnk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIF9jYWNoZWRfdHJhbnNsYXRpb25fY29uZmlnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0IGZ1bmN0aW9uIHNhdmVfdHJhbnNsYXRpb25fY29uZmlnKCkge1xyXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0cmFuc2xhdGlvbl9jb25maWdfa2V5LCBKU09OLnN0cmluZ2lmeShfY2FjaGVkX3RyYW5zbGF0aW9uX2NvbmZpZykpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJfcmVwb3NpdG9yeShyZXBvc2l0b3J5OiBUcmFuc2xhdGlvblJlcG9zaXRvcnkpIHtcclxuICAgICAgICBpZighcmVwb3NpdG9yeSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBmb3IoY29uc3QgcmVwbyBvZiBjb25maWcucmVwb3NpdG9yeV9jb25maWcoKS5yZXBvc2l0b3JpZXMpXHJcbiAgICAgICAgICAgIGlmKHJlcG8udXJsID09IHJlcG9zaXRvcnkudXJsKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbmZpZy5yZXBvc2l0b3J5X2NvbmZpZygpLnJlcG9zaXRvcmllcy5wdXNoKHJlcG9zaXRvcnkpO1xyXG4gICAgICAgIGNvbmZpZy5zYXZlX3JlcG9zaXRvcnlfY29uZmlnKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZWdpc3RlcmVkX3JlcG9zaXRvcmllcygpIDogVHJhbnNsYXRpb25SZXBvc2l0b3J5W10ge1xyXG4gICAgICAgIHJldHVybiBjb25maWcucmVwb3NpdG9yeV9jb25maWcoKS5yZXBvc2l0b3JpZXMubWFwKGUgPT4gZS5yZXBvc2l0b3J5IHx8IHt1cmw6IGUudXJsLCBsb2FkX3RpbWVzdGFtcDogMH0gYXMgVHJhbnNsYXRpb25SZXBvc2l0b3J5KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGRlbGV0ZV9yZXBvc2l0b3J5KHJlcG9zaXRvcnk6IFRyYW5zbGF0aW9uUmVwb3NpdG9yeSkge1xyXG4gICAgICAgIGlmKCFyZXBvc2l0b3J5KSByZXR1cm47XHJcblxyXG4gICAgICAgIGZvcihjb25zdCByZXBvIG9mIFsuLi5jb25maWcucmVwb3NpdG9yeV9jb25maWcoKS5yZXBvc2l0b3JpZXNdKVxyXG4gICAgICAgICAgICBpZihyZXBvLnVybCA9PSByZXBvc2l0b3J5LnVybCkge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLnJlcG9zaXRvcnlfY29uZmlnKCkucmVwb3NpdG9yaWVzLnJlbW92ZShyZXBvKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIGNvbmZpZy5zYXZlX3JlcG9zaXRvcnlfY29uZmlnKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGl0ZXJhdGVfcmVwb3NpdG9yaWVzKGNhbGxiYWNrX2VudHJ5OiAocmVwb3NpdG9yeTogVHJhbnNsYXRpb25SZXBvc2l0b3J5KSA9PiBhbnkpIHtcclxuICAgICAgICBjb25zdCBwcm9taXNlcyA9IFtdO1xyXG5cclxuICAgICAgICBmb3IoY29uc3QgcmVwb3NpdG9yeSBvZiByZWdpc3RlcmVkX3JlcG9zaXRvcmllcygpKSB7XHJcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2gobG9hZF9yZXBvc2l0b3J5MChyZXBvc2l0b3J5LCBmYWxzZSkudGhlbigoKSA9PiBjYWxsYmFja19lbnRyeShyZXBvc2l0b3J5KSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuSTE4TiwgXCJGYWlsZWQgdG8gZmV0Y2ggcmVwb3NpdG9yeSAlcy4gZXJyb3I6ICVvXCIsIHJlcG9zaXRvcnkudXJsLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VsZWN0X3RyYW5zbGF0aW9uKHJlcG9zaXRvcnk6IFRyYW5zbGF0aW9uUmVwb3NpdG9yeSwgZW50cnk6IFJlcG9zaXRvcnlUcmFuc2xhdGlvbikge1xyXG4gICAgICAgIGNvbnN0IGNmZyA9IGNvbmZpZy50cmFuc2xhdGlvbl9jb25maWcoKTtcclxuXHJcbiAgICAgICAgaWYoZW50cnkgJiYgcmVwb3NpdG9yeSkge1xyXG4gICAgICAgICAgICBjZmcuY3VycmVudF9sYW5ndWFnZSA9IGVudHJ5Lm5hbWU7XHJcbiAgICAgICAgICAgIGNmZy5jdXJyZW50X3JlcG9zaXRvcnlfdXJsID0gcmVwb3NpdG9yeS51cmw7XHJcbiAgICAgICAgICAgIGNmZy5jdXJyZW50X3RyYW5zbGF0aW9uX3VybCA9IHJlcG9zaXRvcnkudXJsICsgZW50cnkucGF0aDtcclxuICAgICAgICAgICAgY2ZnLmN1cnJlbnRfdHJhbnNsYXRpb25fcGF0aCA9IGVudHJ5LnBhdGg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2ZnLmN1cnJlbnRfbGFuZ3VhZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGNmZy5jdXJyZW50X3JlcG9zaXRvcnlfdXJsID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBjZmcuY3VycmVudF90cmFuc2xhdGlvbl91cmwgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGNmZy5jdXJyZW50X3RyYW5zbGF0aW9uX3BhdGggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25maWcuc2F2ZV90cmFuc2xhdGlvbl9jb25maWcoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKiBBVFRFTlRJT046IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBiZWZvcmUgbW9zdCBvdGhlciBsaWJyYXJ5IGluaXppYWxpc2F0aW9ucyEgKi9cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIGNvbnN0IHJjZmcgPSBjb25maWcucmVwb3NpdG9yeV9jb25maWcoKTsgLyogaW5pdGlhbGl6ZSAqL1xyXG4gICAgICAgIGNvbnN0IGNmZyA9IGNvbmZpZy50cmFuc2xhdGlvbl9jb25maWcoKTtcclxuXHJcbiAgICAgICAgaWYoY2ZnLmN1cnJlbnRfdHJhbnNsYXRpb25fdXJsKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBsb2FkX2ZpbGUoY2ZnLmN1cnJlbnRfdHJhbnNsYXRpb25fdXJsLCBjZmcuY3VycmVudF90cmFuc2xhdGlvbl9wYXRoKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBzZWxlY3RlZCB0cmFuc2xhdGlvbjogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNob3dfZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRXJyb3JNb2RhbCh0cihcIlRyYW5zbGF0aW9uIFN5c3RlbVwiKSwgdHJhKFwiRmFpbGVkIHRvIGxvYWQgY3VycmVudCBzZWxlY3RlZCB0cmFuc2xhdGlvbiBmaWxlLns6YnI6fUZpbGU6IHswfXs6YnI6fUVycm9yOiB7MX17OmJyOn17OmJyOn1Vc2luZyBkZWZhdWx0IGZhbGxiYWNrIHRyYW5zbGF0aW9ucy5cIiwgY2ZnLmN1cnJlbnRfdHJhbnNsYXRpb25fdXJsLCBlcnJvcikpLm9wZW4oKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGlmKGxvYWRlci5ydW5uaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVyLnJlZ2lzdGVyX3Rhc2sobG9hZGVyLlN0YWdlLkpBVkFTQ1JJUFRfSU5JVElBTElaSU5HLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb246IGFzeW5jICgpID0+IHNob3dfZXJyb3IoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJJMThOIGVycm9yIGRpc3BsYXlcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHNob3dfZXJyb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBhd2FpdCBsb2FkX2ZpbGUoXCJodHRwOi8vbG9jYWxob3N0L2hvbWUvVGVhU3BlYWsvVGVhU3BlYWsvV2ViLUNsaWVudC93ZWIvZW52aXJvbm1lbnQvZGV2ZWxvcG1lbnQvaTE4bi9kZV9ERS50cmFuc2xhdGlvblwiKTtcclxuICAgICAgICAvLyBhd2FpdCBsb2FkX2ZpbGUoXCJodHRwOi8vbG9jYWxob3N0L2hvbWUvVGVhU3BlYWsvVGVhU3BlYWsvV2ViLUNsaWVudC93ZWIvZW52aXJvbm1lbnQvZGV2ZWxvcG1lbnQvaTE4bi90ZXN0Lmpzb25cIik7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIEB0cy1pZ25vcmVcclxuY29uc3QgdHI6IHR5cGVvZiBpMThuLnRyID0gaTE4bi50cjtcclxuY29uc3QgdHJhOiB0eXBlb2YgaTE4bi50cmEgPSBpMThuLnRyYTtcclxuXHJcbih3aW5kb3cgYXMgYW55KS50ciA9IGkxOG4udHI7XHJcbih3aW5kb3cgYXMgYW55KS50cmEgPSBpMThuLnRyYTsiLCJpbXBvcnQgc3Bhd25ZZXNObyA9IE1vZGFscy5zcGF3blllc05vO1xyXG5pbXBvcnQge0Nvbm5lY3Rpb25IYW5kbGVyfSBmcm9tIFwiLi9Db25uZWN0aW9uSGFuZGxlclwiO1xyXG5pbXBvcnQge2JpcGN9IGZyb20gXCIuL0Jyb3dzZXJJUENcIjtcclxuaW1wb3J0IHtsb2csIExvZ0NhdGVnb3J5fSBmcm9tIFwiLi9sb2dcIjtcclxuaW1wb3J0IHtwcm9maWxlc30gZnJvbSBcIi4vcHJvZmlsZXMvQ29ubmVjdGlvblByb2ZpbGVcIjtcclxuaW1wb3J0IHtNb2RhbHN9IGZyb20gXCIuL3VpL21vZGFsL01vZGFsQ29ubmVjdFwiO1xyXG5pbXBvcnQge3NldHRpbmdzLCBTZXR0aW5nc30gZnJvbSBcIi4vc2V0dGluZ3NcIjtcclxuaW1wb3J0IHtpMThufSBmcm9tIFwiLi9pMThuL2xvY2FsaXplXCI7XHJcbmltcG9ydCB7Y3JlYXRlSW5mb01vZGFsfSBmcm9tIFwiLi91aS9lbGVtZW50cy9tb2RhbFwiO1xyXG5pbXBvcnQge01lc3NhZ2VIZWxwZXJ9IGZyb20gXCIuL3VpL2ZyYW1lcy9jaGF0XCI7XHJcblxyXG5leHBvcnQgY29uc3QganNfcmVuZGVyID0gd2luZG93LmpzcmVuZGVyIHx8ICQ7XHJcbmV4cG9ydCBjb25zdCBuYXRpdmVfY2xpZW50ID0gd2luZG93LnJlcXVpcmUgIT09IHVuZGVmaW5lZDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRVc2VyTWVkaWFGdW5jdGlvblByb21pc2UoKSA6IChjb25zdHJhaW50czogTWVkaWFTdHJlYW1Db25zdHJhaW50cykgPT4gUHJvbWlzZTxNZWRpYVN0cmVhbT4ge1xyXG4gICAgaWYoJ21lZGlhRGV2aWNlcycgaW4gbmF2aWdhdG9yICYmICdnZXRVc2VyTWVkaWEnIGluIG5hdmlnYXRvci5tZWRpYURldmljZXMpXHJcbiAgICAgICAgcmV0dXJuIGNvbnN0cmFpbnRzID0+IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKTtcclxuXHJcbiAgICBjb25zdCBfY2FsbGJhY2tlZF9mdW5jdGlvbiA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhO1xyXG4gICAgaWYoIV9jYWxsYmFja2VkX2Z1bmN0aW9uKVxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgcmV0dXJuIGNvbnN0cmFpbnRzID0+IG5ldyBQcm9taXNlPE1lZGlhU3RyZWFtPigocmVzb2x2ZSwgcmVqZWN0KSA9PiBfY2FsbGJhY2tlZF9mdW5jdGlvbihjb25zdHJhaW50cywgcmVzb2x2ZSwgcmVqZWN0KSk7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2luZG93IHtcclxuICAgIG9wZW5fY29ubmVjdGVkX3F1ZXN0aW9uOiAoKSA9PiBQcm9taXNlPGJvb2xlYW4+O1xyXG59XHJcblxyXG5leHBvcnQgZGVjbGFyZSBjb25zdCBub2RlUmVxdWlyZTogdHlwZW9mIHJlcXVpcmU7XHJcbmV4cG9ydCBmdW5jdGlvbiBzZXR1cF9jbG9zZSgpIHtcclxuICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGV2ZW50ID0+IHtcclxuICAgICAgICBpZihwcm9maWxlcy5yZXF1aXJlc19zYXZlKCkpXHJcbiAgICAgICAgICAgIHByb2ZpbGVzLnNhdmUoKTtcclxuXHJcbiAgICAgICAgaWYoIXNldHRpbmdzLnN0YXRpYyhTZXR0aW5ncy5LRVlfRElTQUJMRV9VTkxPQURfRElBTE9HLCBmYWxzZSkpIHtcclxuICAgICAgICAgICAgY29uc3QgYWN0aXZlX2Nvbm5lY3Rpb25zID0gc2VydmVyX2Nvbm5lY3Rpb25zLnNlcnZlcl9jb25uZWN0aW9uX2hhbmRsZXJzKCkuZmlsdGVyKGUgPT4gZS5jb25uZWN0ZWQpO1xyXG4gICAgICAgICAgICBpZihhY3RpdmVfY29ubmVjdGlvbnMubGVuZ3RoID09IDApIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmKCFuYXRpdmVfY2xpZW50KSB7XHJcbiAgICAgICAgICAgICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IFwiQXJlIHlvdSByZWFsbHkgc3VyZT88YnI+WW91J3JlIHN0aWxsIGNvbm5lY3RlZCFcIjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRvX2V4aXQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHAgPSBzZXJ2ZXJfY29ubmVjdGlvbnMuc2VydmVyX2Nvbm5lY3Rpb25faGFuZGxlcnMoKS5tYXAoZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGUuc2VydmVyQ29ubmVjdGlvbi5jb25uZWN0ZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnNlcnZlckNvbm5lY3Rpb24uZGlzY29ubmVjdCh0cihcImNsaWVudCBjbG9zZWRcIikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkubWFwKGUgPT4gZS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybih0cihcIkZhaWxlZCB0byBkaXNjb25uZWN0IGZyb20gc2VydmVyIG9uIGNsaWVudCBjbG9zZTogJW9cIiksIGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhpdCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge3JlbW90ZX0gPSBub2RlUmVxdWlyZSgnZWxlY3Ryb24nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKGRwKS50aGVuKGV4aXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGZvcmNlIGV4aXQgYWZ0ZXIgMjUwMG1zICovXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChleGl0LCAyNTAwKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBpZih3aW5kb3cub3Blbl9jb25uZWN0ZWRfcXVlc3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnJldHVyblZhbHVlID0gXCJxdWVzdGlvblwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vcGVuX2Nvbm5lY3RlZF9xdWVzdGlvbigpLnRoZW4ocmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBwcmV2ZW50IHF1aXR0aW5nIGJlY2F1c2Ugd2UgdHJ5IHRvIGRpc2Nvbm5lY3QgKi9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGUgPT4gZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGFsbG93IGEgZm9yY2UgcXVpdCBhZnRlciA1IHNlY29uZHMgKi9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gd2luZG93Lm9uYmVmb3JldW5sb2FkLCA1MDAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvX2V4aXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvKiB3ZSdyZSBpbiBkZWJ1Z2dpbmcgbW9kZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGRvX2V4aXQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbmV4cG9ydCBkZWNsYXJlIGZ1bmN0aW9uIG1vbWVudCguLi5hcmd1bWVudHMpIDogYW55O1xyXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBfanNyZW5kZXIoKSA6IGJvb2xlYW4ge1xyXG4gICAgaWYoIWpzX3JlbmRlcikge1xyXG4gICAgICAgIGxvYWRlci5jcml0aWNhbF9lcnJvcihcIk1pc3NpbmcganNyZW5kZXIgZXh0ZW5zaW9uIVwiKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBpZighanNfcmVuZGVyLnZpZXdzKSB7XHJcbiAgICAgICAgbG9hZGVyLmNyaXRpY2FsX2Vycm9yKFwiTWlzc2luZyBqc3JlbmRlciB2aWV3ZXIgZXh0ZW5zaW9uIVwiKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBqc19yZW5kZXIudmlld3Muc2V0dGluZ3MuYWxsb3dDb2RlKHRydWUpO1xyXG4gICAganNfcmVuZGVyLnZpZXdzLnRhZ3MoXCJybmRcIiwgKGFyZ3VtZW50KSA9PiB7XHJcbiAgICAgICAgbGV0IG1pbiA9IHBhcnNlSW50KGFyZ3VtZW50LnN1YnN0cigwLCBhcmd1bWVudC5pbmRleE9mKCd+JykpKTtcclxuICAgICAgICBsZXQgbWF4ID0gcGFyc2VJbnQoYXJndW1lbnQuc3Vic3RyKGFyZ3VtZW50LmluZGV4T2YoJ34nKSArIDEpKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobWluICsgbWF4ICsgMSkgLSBtaW4pKS50b1N0cmluZygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAganNfcmVuZGVyLnZpZXdzLnRhZ3MoXCJmbXRfZGF0ZVwiLCAoLi4uYXJncykgPT4ge1xyXG4gICAgICAgIHJldHVybiBtb21lbnQoYXJnc1swXSkuZm9ybWF0KGFyZ3NbMV0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAganNfcmVuZGVyLnZpZXdzLnRhZ3MoXCJ0clwiLCAoLi4uYXJncykgPT4ge1xyXG4gICAgICAgIHJldHVybiB0cihhcmdzWzBdKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCIuanNyZW5kZXItdGVtcGxhdGVcIikuZWFjaCgoaWR4LCBfZW50cnkpID0+IHtcclxuICAgICAgICBpZighanNfcmVuZGVyLnRlbXBsYXRlcyhfZW50cnkuaWQsIF9lbnRyeS5pbm5lckhUTUwpKSB7XHJcbiAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5HRU5FUkFMLCB0cihcIkZhaWxlZCB0byBzZXR1cCBjYWNoZSBmb3IganMgcmVuZGVyZXIgdGVtcGxhdGUgJXMhXCIpLCBfZW50cnkuaWQpO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBsb2cuaW5mbyhMb2dDYXRlZ29yeS5HRU5FUkFMLCB0cihcIlN1Y2Nlc3NmdWxseSBsb2FkZWQganNyZW5kZXIgdGVtcGxhdGUgJXNcIiksIF9lbnRyeS5pZCk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgIFNldHRpbmdzLmluaXRpYWxpemUoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IGkxOG4uaW5pdGlhbGl6ZSgpO1xyXG4gICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZWQgdGhlIHRyYW5zbGF0aW9uIHN5c3RlbSFcXG5FcnJvcjogJW9cIiksIGVycm9yKTtcclxuICAgICAgICBsb2FkZXIuY3JpdGljYWxfZXJyb3IoXCJGYWlsZWQgdG8gc2V0dXAgdGhlIHRyYW5zbGF0aW9uIHN5c3RlbVwiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgYmlwYy5zZXR1cCgpO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdGlhbGl6ZV9hcHAoKSB7XHJcbiAgICB0cnkgeyAvL0luaXRpYWxpemUgbWFpbiB0ZW1wbGF0ZVxyXG4gICAgICAgIGNvbnN0IG1haW4gPSAkKFwiI3RtcGxfbWFpblwiKS5yZW5kZXJUYWcoe1xyXG4gICAgICAgICAgICBtdWx0aV9zZXNzaW9uOiAgIXNldHRpbmdzLnN0YXRpY19nbG9iYWwoU2V0dGluZ3MuS0VZX0RJU0FCTEVfTVVMVElfU0VTU0lPTiksXHJcbiAgICAgICAgICAgIGFwcF92ZXJzaW9uOiBhcHAudWlfdmVyc2lvbigpXHJcbiAgICAgICAgfSkuZGl2aWRlcmZ5KCk7XHJcblxyXG4gICAgICAgICQoXCJib2R5XCIpLmFwcGVuZChtYWluKTtcclxuICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuR0VORVJBTCwgZXJyb3IpO1xyXG4gICAgICAgIGxvYWRlci5jcml0aWNhbF9lcnJvcih0cihcIkZhaWxlZCB0byBzZXR1cCBtYWluIHBhZ2UhXCIpKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29udHJvbF9iYXIgPSBuZXcgQ29udHJvbEJhcigkKFwiI2NvbnRyb2xfYmFyXCIpKTsgLyogc2V0dXAgdGhlIGNvbnRyb2wgYmFyICovXHJcblxyXG4gICAgaWYoIWF1ZGlvLnBsYXllci5pbml0aWFsaXplKCkpXHJcbiAgICAgICAgY29uc29sZS53YXJuKHRyKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgYXVkaW8gY29udHJvbGxlciFcIikpO1xyXG5cclxuICAgIGF1ZGlvLnBsYXllci5vbl9yZWFkeSgoKSA9PiB7XHJcbiAgICAgICAgaWYoYXVkaW8ucGxheWVyLnNldF9tYXN0ZXJfdm9sdW1lKVxyXG4gICAgICAgICAgICBhdWRpby5wbGF5ZXIub25fcmVhZHkoKCkgPT4gYXVkaW8ucGxheWVyLnNldF9tYXN0ZXJfdm9sdW1lKHNldHRpbmdzLmdsb2JhbChTZXR0aW5ncy5LRVlfU09VTkRfTUFTVEVSKSAvIDEwMCkpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgbG9nLndhcm4oTG9nQ2F0ZWdvcnkuR0VORVJBTCwgdHIoXCJDbGllbnQgZG9lcyBub3Qgc3VwcG9ydCBhdWRpby5wbGF5ZXIuc2V0X21hc3Rlcl92b2x1bWUoKS4uLiBNYXkgY2xpZW50IGlzIHRvbyBvbGQ/XCIpKTtcclxuICAgICAgICBpZihhdWRpby5yZWNvcmRlci5kZXZpY2VfcmVmcmVzaF9hdmFpbGFibGUoKSlcclxuICAgICAgICAgICAgYXVkaW8ucmVjb3JkZXIucmVmcmVzaF9kZXZpY2VzKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBkZWZhdWx0X3JlY29yZGVyID0gbmV3IFJlY29yZGVyUHJvZmlsZShcImRlZmF1bHRcIik7XHJcbiAgICBkZWZhdWx0X3JlY29yZGVyLmluaXRpYWxpemUoKS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5LkFVRElPLCB0cihcIkZhaWxlZCB0byBpbml0aWFsaXplIGRlZmF1bHQgcmVjb3JkZXI6ICVvXCIpLCBlcnJvcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICBzb3VuZC5pbml0aWFsaXplKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuQVVESU8sIHRyKFwiU291bmRzIGluaXRpYWxpemVkXCIpKTtcclxuICAgIH0pO1xyXG4gICAgc291bmQuc2V0X21hc3Rlcl92b2x1bWUoc2V0dGluZ3MuZ2xvYmFsKFNldHRpbmdzLktFWV9TT1VORF9NQVNURVJfU09VTkRTKSAvIDEwMCk7XHJcblxyXG4gICAgYXdhaXQgcHJvZmlsZXMubG9hZCgpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgcHB0LmluaXRpYWxpemUoKTtcclxuICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuR0VORVJBTCwgdHIoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBwcHQhXFxuRXJyb3I6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgbG9hZGVyLmNyaXRpY2FsX2Vycm9yKHRyKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgcHB0IVwiKSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHNldHVwX2Nsb3NlKCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHIyYWI4KHN0cikge1xyXG4gICAgY29uc3QgYnVmID0gbmV3IEFycmF5QnVmZmVyKHN0ci5sZW5ndGgpO1xyXG4gICAgY29uc3QgYnVmVmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zik7XHJcbiAgICBmb3IgKGxldCBpID0gMCwgc3RyTGVuID0gc3RyLmxlbmd0aDsgaSA8IHN0ckxlbjsgaSsrKSB7XHJcbiAgICAgICAgYnVmVmlld1tpXSA9IHN0ci5jaGFyQ29kZUF0KGkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGJ1ZjtcclxufVxyXG5cclxuLyogRklYTUUgRG9udCB1c2UgYXRvYiwgYmVjYXVzZSBpdCBzdWNrcyBmb3Igbm9uIFVURi04IHRpbmdzICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhcnJheUJ1ZmZlckJhc2U2NChiYXNlNjQ6IHN0cmluZykge1xyXG4gICAgYmFzZTY0ID0gYXRvYihiYXNlNjQpO1xyXG4gICAgY29uc3QgYnVmID0gbmV3IEFycmF5QnVmZmVyKGJhc2U2NC5sZW5ndGgpO1xyXG4gICAgY29uc3QgYnVmVmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zik7XHJcbiAgICBmb3IgKGxldCBpID0gMCwgc3RyTGVuID0gYmFzZTY0Lmxlbmd0aDsgaSA8IHN0ckxlbjsgaSsrKSB7XHJcbiAgICAgICAgYnVmVmlld1tpXSA9IGJhc2U2NC5jaGFyQ29kZUF0KGkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGJ1ZjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NF9lbmNvZGVfYWIoc291cmNlOiBBcnJheUJ1ZmZlckxpa2UpIHtcclxuICAgIGNvbnN0IGVuY29kaW5ncyA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrL1wiO1xyXG4gICAgbGV0IGJhc2U2NCAgICAgID0gXCJcIjtcclxuXHJcbiAgICBjb25zdCBieXRlcyAgICAgICAgICA9IG5ldyBVaW50OEFycmF5KHNvdXJjZSk7XHJcbiAgICBjb25zdCBieXRlX2xlbmd0aCAgICA9IGJ5dGVzLmJ5dGVMZW5ndGg7XHJcbiAgICBjb25zdCBieXRlX3JlbWluZGVyICA9IGJ5dGVfbGVuZ3RoICUgMztcclxuICAgIGNvbnN0IG1haW5fbGVuZ3RoICAgID0gYnl0ZV9sZW5ndGggLSBieXRlX3JlbWluZGVyO1xyXG5cclxuICAgIGxldCBhLCBiLCBjLCBkO1xyXG4gICAgbGV0IGNodW5rO1xyXG5cclxuICAgIC8vIE1haW4gbG9vcCBkZWFscyB3aXRoIGJ5dGVzIGluIGNodW5rcyBvZiAzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1haW5fbGVuZ3RoOyBpID0gaSArIDMpIHtcclxuICAgICAgICAvLyBDb21iaW5lIHRoZSB0aHJlZSBieXRlcyBpbnRvIGEgc2luZ2xlIGludGVnZXJcclxuICAgICAgICBjaHVuayA9IChieXRlc1tpXSA8PCAxNikgfCAoYnl0ZXNbaSArIDFdIDw8IDgpIHwgYnl0ZXNbaSArIDJdO1xyXG5cclxuICAgICAgICAvLyBVc2UgYml0bWFza3MgdG8gZXh0cmFjdCA2LWJpdCBzZWdtZW50cyBmcm9tIHRoZSB0cmlwbGV0XHJcbiAgICAgICAgYSA9IChjaHVuayAmIDE2NTE1MDcyKSA+PiAxODsgLy8gMTY1MTUwNzIgPSAoMl42IC0gMSkgPDwgMThcclxuICAgICAgICBiID0gKGNodW5rICYgMjU4MDQ4KSAgID4+IDEyOyAvLyAyNTgwNDggICA9ICgyXjYgLSAxKSA8PCAxMlxyXG4gICAgICAgIGMgPSAoY2h1bmsgJiA0MDMyKSAgICAgPj4gIDY7IC8vIDQwMzIgICAgID0gKDJeNiAtIDEpIDw8ICA2XHJcbiAgICAgICAgZCA9IChjaHVuayAmIDYzKSAgICAgICA+PiAgMDsgLy8gNjMgICAgICAgPSAoMl42IC0gMSkgPDwgIDBcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0aGUgcmF3IGJpbmFyeSBzZWdtZW50cyB0byB0aGUgYXBwcm9wcmlhdGUgQVNDSUkgZW5jb2RpbmdcclxuICAgICAgICBiYXNlNjQgKz0gZW5jb2RpbmdzW2FdICsgZW5jb2RpbmdzW2JdICsgZW5jb2RpbmdzW2NdICsgZW5jb2RpbmdzW2RdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlYWwgd2l0aCB0aGUgcmVtYWluaW5nIGJ5dGVzIGFuZCBwYWRkaW5nXHJcbiAgICBpZiAoYnl0ZV9yZW1pbmRlciA9PSAxKSB7XHJcbiAgICAgICAgY2h1bmsgPSBieXRlc1ttYWluX2xlbmd0aF07XHJcblxyXG4gICAgICAgIGEgPSAoY2h1bmsgJiAyNTIpID4+IDI7IC8vIDI1MiA9ICgyXjYgLSAxKSA8PCAyXHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgNCBsZWFzdCBzaWduaWZpY2FudCBiaXRzIHRvIHplcm9cclxuICAgICAgICBiID0gKGNodW5rICYgMykgICA8PCA0OyAvLyAzICAgPSAyXjIgLSAxXHJcblxyXG4gICAgICAgIGJhc2U2NCArPSBlbmNvZGluZ3NbYV0gKyBlbmNvZGluZ3NbYl0gKyAnPT0nO1xyXG4gICAgfSBlbHNlIGlmIChieXRlX3JlbWluZGVyID09IDIpIHtcclxuICAgICAgICBjaHVuayA9IChieXRlc1ttYWluX2xlbmd0aF0gPDwgOCkgfCBieXRlc1ttYWluX2xlbmd0aCArIDFdO1xyXG5cclxuICAgICAgICBhID0gKGNodW5rICYgNjQ1MTIpID4+IDEwOyAvLyA2NDUxMiA9ICgyXjYgLSAxKSA8PCAxMFxyXG4gICAgICAgIGIgPSAoY2h1bmsgJiAxMDA4KSAgPj4gIDQ7IC8vIDEwMDggID0gKDJeNiAtIDEpIDw8ICA0XHJcblxyXG4gICAgICAgIC8vIFNldCB0aGUgMiBsZWFzdCBzaWduaWZpY2FudCBiaXRzIHRvIHplcm9cclxuICAgICAgICBjID0gKGNodW5rICYgMTUpICAgIDw8ICAyOyAvLyAxNSAgICA9IDJeNCAtIDFcclxuXHJcbiAgICAgICAgYmFzZTY0ICs9IGVuY29kaW5nc1thXSArIGVuY29kaW5nc1tiXSArIGVuY29kaW5nc1tjXSArICc9JztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYmFzZTY0XHJcbn1cclxuXHJcbi8qXHJcbmNsYXNzIFRlc3RQcm94eSBleHRlbmRzIGJpcGMuTWV0aG9kUHJveHkge1xyXG4gICAgY29uc3RydWN0b3IocGFyYW1zOiBiaXBjLk1ldGhvZFByb3h5Q29ubmVjdFBhcmFtZXRlcnMpIHtcclxuICAgICAgICBzdXBlcihiaXBjLmdldF9oYW5kbGVyKCksIHBhcmFtcy5jaGFubmVsX2lkICYmIHBhcmFtcy5jbGllbnRfaWQgPyBwYXJhbXMgOiB1bmRlZmluZWQpO1xyXG5cclxuICAgICAgICBpZighdGhpcy5pc19zbGF2ZSgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJfbWV0aG9kKHRoaXMuYWRkX3NsYXZlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIXRoaXMuaXNfbWFzdGVyKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWdpc3Rlcl9tZXRob2QodGhpcy5zYXlfaGVsbG8pO1xyXG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyX21ldGhvZCh0aGlzLmFkZF9tYXN0ZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXR1cCgpIHtcclxuICAgICAgICBzdXBlci5zZXR1cCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBvbl9jb25uZWN0ZWQoKSB7XHJcbiAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuSVBDLCBcIlRlc3QgcHJveHkgY29ubmVjdGVkXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBvbl9kaXNjb25uZWN0ZWQoKSB7XHJcbiAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuSVBDLCBcIlRlc3QgcHJveHkgZGlzY29ubmVjdGVkXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2F5X2hlbGxvKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBsb2cuaW5mbyhMb2dDYXRlZ29yeS5JUEMsIFwiSGVsbG8gV29ybGRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRfc2xhdmUoYTogbnVtYmVyLCBiOiBudW1iZXIpIDogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgICAgICByZXR1cm4gYSArIGI7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRfbWFzdGVyKGE6IG51bWJlciwgYjogbnVtYmVyKSA6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICAgICAgcmV0dXJuIGEgKiBiO1xyXG4gICAgfVxyXG59XHJcbmludGVyZmFjZSBXaW5kb3cge1xyXG4gICAgcHJveHlfaW5zdGFuY2U6IFRlc3RQcm94eSAmIHt1cmw6ICgpID0+IHN0cmluZ307XHJcbn1cclxuKi9cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZV9jb25uZWN0X3JlcXVlc3QocHJvcGVydGllczogYmlwYy5jb25uZWN0LkNvbm5lY3RSZXF1ZXN0RGF0YSwgY29ubmVjdGlvbjogQ29ubmVjdGlvbkhhbmRsZXIpIHtcclxuICAgIGNvbnN0IHByb2ZpbGVfdXVpZCA9IHByb3BlcnRpZXMucHJvZmlsZSB8fCAocHJvZmlsZXMuZGVmYXVsdF9wcm9maWxlKCkgfHwge2lkOiAnZGVmYXVsdCd9KS5pZDtcclxuICAgIGNvbnN0IHByb2ZpbGUgPSBwcm9maWxlcy5maW5kX3Byb2ZpbGUocHJvZmlsZV91dWlkKSB8fCBwcm9maWxlcy5kZWZhdWx0X3Byb2ZpbGUoKTtcclxuICAgIGNvbnN0IHVzZXJuYW1lID0gcHJvcGVydGllcy51c2VybmFtZSB8fCBwcm9maWxlLmNvbm5lY3RfdXNlcm5hbWUoKTtcclxuXHJcbiAgICBjb25zdCBwYXNzd29yZCA9IHByb3BlcnRpZXMucGFzc3dvcmQgPyBwcm9wZXJ0aWVzLnBhc3N3b3JkLnZhbHVlIDogXCJcIjtcclxuICAgIGNvbnN0IHBhc3N3b3JkX2hhc2hlZCA9IHByb3BlcnRpZXMucGFzc3dvcmQgPyBwcm9wZXJ0aWVzLnBhc3N3b3JkLmhhc2hlZCA6IGZhbHNlO1xyXG5cclxuICAgIGlmKHByb2ZpbGUgJiYgcHJvZmlsZS52YWxpZCgpKSB7XHJcbiAgICAgICAgY29ubmVjdGlvbi5zdGFydENvbm5lY3Rpb24ocHJvcGVydGllcy5hZGRyZXNzLCBwcm9maWxlLCB0cnVlLCB7XHJcbiAgICAgICAgICAgIG5pY2tuYW1lOiB1c2VybmFtZSxcclxuICAgICAgICAgICAgcGFzc3dvcmQ6IHBhc3N3b3JkLmxlbmd0aCA+IDAgPyB7XHJcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogcGFzc3dvcmQsXHJcbiAgICAgICAgICAgICAgICBoYXNoZWQ6IHBhc3N3b3JkX2hhc2hlZFxyXG4gICAgICAgICAgICB9IDogdW5kZWZpbmVkXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2VydmVyX2Nvbm5lY3Rpb25zLnNldF9hY3RpdmVfY29ubmVjdGlvbl9oYW5kbGVyKGNvbm5lY3Rpb24pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBNb2RhbHMuc3Bhd25Db25uZWN0TW9kYWwoe30se1xyXG4gICAgICAgICAgICB1cmw6IHByb3BlcnRpZXMuYWRkcmVzcyxcclxuICAgICAgICAgICAgZW5mb3JjZTogdHJ1ZVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgcHJvZmlsZTogcHJvZmlsZSxcclxuICAgICAgICAgICAgZW5mb3JjZTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBtYWluKCkge1xyXG4gICAgLypcclxuICAgIHdpbmRvdy5wcm94eV9pbnN0YW5jZSA9IG5ldyBUZXN0UHJveHkoe1xyXG4gICAgICAgIGNsaWVudF9pZDogc2V0dGluZ3Muc3RhdGljX2dsb2JhbDxzdHJpbmc+KFwicHJveHlfY2xpZW50X2lkXCIsIHVuZGVmaW5lZCksXHJcbiAgICAgICAgY2hhbm5lbF9pZDogc2V0dGluZ3Muc3RhdGljX2dsb2JhbDxzdHJpbmc+KFwicHJveHlfY2hhbm5lbF9pZFwiLCB1bmRlZmluZWQpXHJcbiAgICB9KSBhcyBhbnk7XHJcbiAgICBpZih3aW5kb3cucHJveHlfaW5zdGFuY2UuaXNfbWFzdGVyKCkpIHtcclxuICAgICAgICB3aW5kb3cucHJveHlfaW5zdGFuY2Uuc2V0dXAoKTtcclxuICAgICAgICB3aW5kb3cucHJveHlfaW5zdGFuY2UudXJsID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gd2luZG93LnByb3h5X2luc3RhbmNlLmdlbmVyYXRlX2Nvbm5lY3RfcGFyYW1ldGVycygpO1xyXG4gICAgICAgICAgICByZXR1cm4gXCJwcm94eV9jaGFubmVsX2lkPVwiICsgZGF0YS5jaGFubmVsX2lkICsgXCImcHJveHlfY2xpZW50X2lkPVwiICsgZGF0YS5jbGllbnRfaWQ7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgICovXHJcbiAgICAvL2h0dHA6Ly9sb2NhbGhvc3Q6NjMzNDMvV2ViLUNsaWVudC9pbmRleC5waHA/X2lqdD1vbWNwbXQ4YjlobmpsZmd1aDhhamdyZ29sciZkZWZhdWx0X2Nvbm5lY3RfdXJsPXRydWUmZGVmYXVsdF9jb25uZWN0X3R5cGU9dGVhbXNwZWFrJmRlZmF1bHRfY29ubmVjdF91cmw9bG9jYWxob3N0JTNBOTk4NyZkaXNhYmxlVW5sb2FkRGlhbG9nPTEmbG9hZGVyX2lnbm9yZV9hZ2U9MVxyXG5cclxuICAgIC8qIGluaXRpYWxpemUgZm9udCAqL1xyXG4gICAge1xyXG4gICAgICAgIGNvbnN0IGZvbnQgPSBzZXR0aW5ncy5zdGF0aWNfZ2xvYmFsKFNldHRpbmdzLktFWV9GT05UX1NJWkUsIDE0KTsgLy9wYXJzZUludChnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHkpLmZvbnRTaXplKVxyXG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuY3NzKFwiZm9udC1zaXplXCIsIGZvbnQgKyBcInB4XCIpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qIGNvbnRleHQgbWVudSBwcmV2ZW50ICovXHJcbiAgICAkKGRvY3VtZW50KS5vbignY29udGV4dG1lbnUnLCBldmVudCA9PiB7XHJcbiAgICAgICAgaWYoZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYoIXNldHRpbmdzLnN0YXRpY19nbG9iYWwoU2V0dGluZ3MuS0VZX0RJU0FCTEVfR0xPQkFMX0NPTlRFWFRfTUVOVSkpXHJcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0b3BfbWVudS5pbml0aWFsaXplKCk7XHJcblxyXG4gICAgc2VydmVyX2Nvbm5lY3Rpb25zID0gbmV3IFNlcnZlckNvbm5lY3Rpb25NYW5hZ2VyKCQoXCIjY29ubmVjdGlvbi1oYW5kbGVyc1wiKSk7XHJcbiAgICBjb250cm9sX2Jhci5pbml0aWFsaXNlKCk7IC8qIGJlZm9yZSBjb25uZWN0aW9uIGhhbmRsZXIgdG8gYWxsb3cgcHJvcGVydHkgYXBwbHkgKi9cclxuXHJcbiAgICBjb25zdCBpbml0aWFsX2hhbmRsZXIgPSBzZXJ2ZXJfY29ubmVjdGlvbnMuc3Bhd25fc2VydmVyX2Nvbm5lY3Rpb25faGFuZGxlcigpO1xyXG4gICAgaW5pdGlhbF9oYW5kbGVyLmFjcXVpcmVfcmVjb3JkZXIoZGVmYXVsdF9yZWNvcmRlciwgZmFsc2UpO1xyXG4gICAgY29udHJvbF9iYXIuc2V0X2Nvbm5lY3Rpb25faGFuZGxlcihpbml0aWFsX2hhbmRsZXIpO1xyXG4gICAgLyoqIFNldHVwIHRoZSBYRiBmb3J1bSBpZGVudGl0eSAqKi9cclxuICAgIHByb2ZpbGVzLmlkZW50aXRpZXMudXBkYXRlX2ZvcnVtKCk7XHJcblxyXG4gICAgbGV0IF9yZXNpemVfdGltZW91dDogTm9kZUpTLlRpbWVyO1xyXG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUnLCBldmVudCA9PiB7XHJcbiAgICAgICAgaWYoZXZlbnQudGFyZ2V0ICE9PSB3aW5kb3cpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYoX3Jlc2l6ZV90aW1lb3V0KVxyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoX3Jlc2l6ZV90aW1lb3V0KTtcclxuICAgICAgICBfcmVzaXplX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgZm9yKGNvbnN0IGNvbm5lY3Rpb24gb2Ygc2VydmVyX2Nvbm5lY3Rpb25zLnNlcnZlcl9jb25uZWN0aW9uX2hhbmRsZXJzKCkpXHJcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmludm9rZV9yZXNpemVkX29uX2FjdGl2YXRlID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc3QgYWN0aXZlX2Nvbm5lY3Rpb24gPSBzZXJ2ZXJfY29ubmVjdGlvbnMuYWN0aXZlX2Nvbm5lY3Rpb25faGFuZGxlcigpO1xyXG4gICAgICAgICAgICBpZihhY3RpdmVfY29ubmVjdGlvbilcclxuICAgICAgICAgICAgICAgIGFjdGl2ZV9jb25uZWN0aW9uLnJlc2l6ZV9lbGVtZW50cygpO1xyXG4gICAgICAgICAgICAkKFwiLndpbmRvdy1yZXNpemUtbGlzdGVuZXJcIikudHJpZ2dlcigncmVzaXplJyk7XHJcbiAgICAgICAgfSwgMTAwMCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBzdGF0cy5pbml0aWFsaXplKHtcclxuICAgICAgICB2ZXJib3NlOiB0cnVlLFxyXG4gICAgICAgIGFub255bWl6ZV9pcF9hZGRyZXNzZXM6IHRydWUsXHJcbiAgICAgICAgdm9sYXRpbGVfY29sbGVjdGlvbl9vbmx5OiBmYWxzZVxyXG4gICAgfSk7XHJcbiAgICBzdGF0cy5yZWdpc3Rlcl91c2VyX2NvdW50X2xpc3RlbmVyKHN0YXR1cyA9PiB7XHJcbiAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuU1RBVElTVElDUywgdHIoXCJSZWNlaXZlZCB1c2VyIGNvdW50IHVwZGF0ZTogJW9cIiksIHN0YXR1cyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBzZXJ2ZXJfY29ubmVjdGlvbnMuc2V0X2FjdGl2ZV9jb25uZWN0aW9uX2hhbmRsZXIoc2VydmVyX2Nvbm5lY3Rpb25zLnNlcnZlcl9jb25uZWN0aW9uX2hhbmRsZXJzKClbMF0pO1xyXG5cclxuXHJcbiAgICAoPGFueT53aW5kb3cpLnRlc3RfdXBsb2FkID0gKG1lc3NhZ2U/OiBzdHJpbmcpID0+IHtcclxuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZSB8fCBcIkhlbGxvIFdvcmxkXCI7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBzZXJ2ZXJfY29ubmVjdGlvbnMuYWN0aXZlX2Nvbm5lY3Rpb25faGFuZGxlcigpO1xyXG4gICAgICAgIGNvbm5lY3Rpb24uZmlsZU1hbmFnZXIudXBsb2FkX2ZpbGUoe1xyXG4gICAgICAgICAgICBzaXplOiBtZXNzYWdlLmxlbmd0aCxcclxuICAgICAgICAgICAgb3ZlcndyaXRlOiB0cnVlLFxyXG4gICAgICAgICAgICBjaGFubmVsOiBjb25uZWN0aW9uLmdldENsaWVudCgpLmN1cnJlbnRDaGFubmVsKCksXHJcbiAgICAgICAgICAgIG5hbWU6ICcvSGVsbG9Xb3JsZC50eHQnLFxyXG4gICAgICAgICAgICBwYXRoOiAnJ1xyXG4gICAgICAgIH0pLnRoZW4oa2V5ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXBsb2FkID0gbmV3IFJlcXVlc3RGaWxlVXBsb2FkKGtleSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShtZXNzYWdlLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1lc3NhZ2UubGVuZ3RoOyBpbmRleCsrKVxyXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleF0gPSBtZXNzYWdlLmNoYXJDb2RlQXQoaW5kZXgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB1cGxvYWQucHV0X2RhdGEoYnVmZmVyKS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuICAgIH07XHJcblxyXG4gICAgLyogc2NoZWR1bGUgaXQgYSBiaXQgbGF0ZXIgdGhlbiB0aGUgbWFpbiBiZWNhdXNlIHRoZSBtYWluIGZ1bmN0aW9uIGlzIHN0aWxsIHdpdGhpbiB0aGUgbG9hZGVyICovXHJcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gc2VydmVyX2Nvbm5lY3Rpb25zLmFjdGl2ZV9jb25uZWN0aW9uX2hhbmRsZXIoKTtcclxuICAgICAgICAvKlxyXG4gICAgICAgIE1vZGFscy5jcmVhdGVDaGFubmVsTW9kYWwoY29ubmVjdGlvbiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNvbm5lY3Rpb24ucGVybWlzc2lvbnMsIChjYiwgcGVybXMpID0+IHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgKi9cclxuICAgICAgIC8vIE1vZGFscy5vcGVuU2VydmVySW5mbyhjb25uZWN0aW9uLmNoYW5uZWxUcmVlLnNlcnZlcik7XHJcbiAgICAgICAgLy9Nb2RhbHMuY3JlYXRlU2VydmVyTW9kYWwoY29ubmVjdGlvbi5jaGFubmVsVHJlZS5zZXJ2ZXIsIHByb3BlcnRpZXMgPT4gUHJvbWlzZS5yZXNvbHZlKCkpO1xyXG5cclxuICAgICAgICAvL01vZGFscy5vcGVuQ2xpZW50SW5mbyhjb25uZWN0aW9uLmdldENsaWVudCgpKTtcclxuICAgICAgICAvL01vZGFscy5vcGVuU2VydmVySW5mb0JhbmR3aWR0aChjb25uZWN0aW9uLmNoYW5uZWxUcmVlLnNlcnZlcik7XHJcblxyXG4gICAgICAgIC8vTW9kYWxzLm9wZW5CYW5MaXN0KGNvbm5lY3Rpb24pO1xyXG4gICAgICAgIC8qXHJcbiAgICAgICAgTW9kYWxzLnNwYXduQmFuQ2xpZW50KGNvbm5lY3Rpb24sW1xyXG4gICAgICAgICAgICB7bmFtZTogXCJXb2x2ZXJpbkRFVlwiLCB1bmlxdWVfaWQ6IFwiWFhYWFwifSxcclxuICAgICAgICAgICAge25hbWU6IFwiV29sdmVyaW5ERVZcIiwgdW5pcXVlX2lkOiBcIlhYWFhcIn0sXHJcbiAgICAgICAgICAgIHtuYW1lOiBcIldvbHZlcmluREVWXCIsIHVuaXF1ZV9pZDogXCJYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFwifSxcclxuICAgICAgICAgICAge25hbWU6IFwiV29sdmVyaW5ERVZcIiwgdW5pcXVlX2lkOiBcIllZWVwifVxyXG4gICAgICAgIF0sICgpID0+IHt9KTtcclxuICAgICAgICAqL1xyXG4gICAgfSwgNDAwMCk7XHJcbiAgICAvL01vZGFscy5zcGF3blNldHRpbmdzTW9kYWwoXCJpZGVudGl0eS1wcm9maWxlc1wiKTtcclxuICAgIC8vTW9kYWxzLnNwYXduS2V5U2VsZWN0KGNvbnNvbGUubG9nKTtcclxuICAgIC8vTW9kYWxzLnNwYXduQm9va21hcmtNb2RhbCgpO1xyXG5cclxuICAgIC8qXHJcbiAgICB7XHJcbiAgICAgICAgY29uc3QgbW9kYWwgPSBjcmVhdGVNb2RhbCh7XHJcbiAgICAgICAgICAgIGhlYWRlcjogdHIoXCJUZXN0IE5ldCBHcmFwaFwiKSxcclxuICAgICAgICAgICAgYm9keTogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2FudmFzID0gJC5zcGF3bihcImNhbnZhc1wiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5jc3MoXCJwb3NpdGlvblwiLCBcImFic29sdXRlXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogMFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAkLnNwYXduKFwiZGl2XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmNzcyhcImhlaWdodFwiLCBcIjVlbVwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5jc3MoXCJ3aWR0aFwiLCBcIjMwZW1cIilcclxuICAgICAgICAgICAgICAgICAgICAuY3NzKFwicG9zaXRpb25cIiwgXCJyZWxhdGl2ZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoY2FudmFzKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZm9vdGVyOiBudWxsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGdyYXBoID0gbmV3IG5ldC5ncmFwaC5HcmFwaChtb2RhbC5odG1sVGFnLmZpbmQoXCJjYW52YXNcIilbMF0gYXMgYW55KTtcclxuICAgICAgICBncmFwaC5pbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgIG1vZGFsLmNsb3NlX2xpc3RlbmVyLnB1c2goKCkgPT4gZ3JhcGgudGVybWluYXRlKCkpO1xyXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgIH1cclxuICAgICAqL1xyXG5cclxuXHJcbiAgICAvKiBmb3IgdGVzdGluZyAqL1xyXG4gICAgaWYoc2V0dGluZ3Muc3RhdGljX2dsb2JhbChTZXR0aW5ncy5LRVlfVVNFUl9JU19ORVcpKSB7XHJcbiAgICAgICAgY29uc3QgbW9kYWwgPSBNb2RhbHMub3Blbk1vZGFsTmV3Y29tZXIoKTtcclxuICAgICAgICBtb2RhbC5jbG9zZV9saXN0ZW5lci5wdXNoKCgpID0+IHNldHRpbmdzLmNoYW5nZUdsb2JhbChTZXR0aW5ncy5LRVlfVVNFUl9JU19ORVcsIGZhbHNlKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNvbnN0IHRhc2tfdGVhd2ViX3N0YXJ0ZXI6IGxvYWRlci5UYXNrID0ge1xyXG4gICAgbmFtZTogXCJ2b2ljZSBhcHAgc3RhcnRlclwiLFxyXG4gICAgZnVuY3Rpb246IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBpbml0aWFsaXplX2FwcCgpO1xyXG4gICAgICAgICAgICBtYWluKCk7XHJcbiAgICAgICAgICAgIGlmKCFhdWRpby5wbGF5ZXIuaW5pdGlhbGl6ZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuVk9JQ0UsIHRyKFwiSW5pdGlhbGl6ZSBhdWRpbyBjb250cm9sbGVyIGxhdGVyIVwiKSk7XHJcbiAgICAgICAgICAgICAgICBpZighYXVkaW8ucGxheWVyLmluaXRpYWxpemVGcm9tR2VzdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJNaXNzaW5nIGF1ZGlvLnBsYXllci5pbml0aWFsaXplRnJvbUdlc3R1cmVcIikpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkub25lKCdjbGljaycsIGV2ZW50ID0+IGF1ZGlvLnBsYXllci5pbml0aWFsaXplRnJvbUdlc3R1cmUoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGV4LnN0YWNrKTtcclxuICAgICAgICAgICAgaWYoZXggaW5zdGFuY2VvZiBSZWZlcmVuY2VFcnJvciB8fCBleCBpbnN0YW5jZW9mIFR5cGVFcnJvcilcclxuICAgICAgICAgICAgICAgIGV4ID0gZXgubmFtZSArIFwiOiBcIiArIGV4Lm1lc3NhZ2U7XHJcbiAgICAgICAgICAgIGxvYWRlci5jcml0aWNhbF9lcnJvcihcIkZhaWxlZCB0byBpbnZva2UgbWFpbiBmdW5jdGlvbjo8YnI+XCIgKyBleCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIHByaW9yaXR5OiAxMFxyXG59O1xyXG5cclxuY29uc3QgdGFza19jb25uZWN0X2hhbmRsZXI6IGxvYWRlci5UYXNrID0ge1xyXG4gICAgbmFtZTogXCJDb25uZWN0IGhhbmRsZXJcIixcclxuICAgIGZ1bmN0aW9uOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgYWRkcmVzcyA9IHNldHRpbmdzLnN0YXRpYyhTZXR0aW5ncy5LRVlfQ09OTkVDVF9BRERSRVNTLCBcIlwiKTtcclxuICAgICAgICBjb25zdCBjaGFuZGxlciA9IGJpcGMuZ2V0X2Nvbm5lY3RfaGFuZGxlcigpO1xyXG4gICAgICAgIGlmKHNldHRpbmdzLnN0YXRpYyhTZXR0aW5ncy5LRVlfRkxBR19DT05ORUNUX0RFRkFVTFQsIGZhbHNlKSAmJiBhZGRyZXNzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RfZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGFkZHJlc3M6IGFkZHJlc3MsXHJcblxyXG4gICAgICAgICAgICAgICAgcHJvZmlsZTogc2V0dGluZ3Muc3RhdGljKFNldHRpbmdzLktFWV9DT05ORUNUX1BST0ZJTEUsIFwiXCIpLFxyXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IHNldHRpbmdzLnN0YXRpYyhTZXR0aW5ncy5LRVlfQ09OTkVDVF9VU0VSTkFNRSwgXCJcIiksXHJcblxyXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2V0dGluZ3Muc3RhdGljKFNldHRpbmdzLktFWV9DT05ORUNUX1BBU1NXT1JELCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgICBoYXNoZWQ6IHNldHRpbmdzLnN0YXRpYyhTZXR0aW5ncy5LRVlfRkxBR19DT05ORUNUX1BBU1NXT1JELCBmYWxzZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGlmKGNoYW5kbGVyKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGNoYW5kbGVyLnBvc3RfY29ubmVjdF9yZXF1ZXN0KGNvbm5lY3RfZGF0YSwgKCkgPT4gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGF3blllc05vKHRyKFwiQW5vdGhlciBUZWFXZWIgaW5zdGFuY2UgaXMgYWxyZWFkeSBydW5uaW5nXCIpLCB0cmEoXCJBbm90aGVyIFRlYVdlYiBpbnN0YW5jZSBpcyBhbHJlYWR5IHJ1bm5pbmcuezpicjp9V291bGQgeW91IGxpa2UgdG8gY29ubmVjdCB0aGVyZT9cIiksIHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zZWFibGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuQ0xJRU5ULCB0cihcIkV4ZWN1dGVkIGNvbm5lY3Qgc3VjY2Vzc2Z1bGx5IGluIGFub3RoZXIgYnJvd3NlciB3aW5kb3cuIENsb3NpbmcgdGhpcyB3aW5kb3dcIikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJZb3UncmUgY29ubmVjdGluZyB0byB7MH0gd2l0aGluIHRoZSBvdGhlciBUZWFXZWIgaW5zdGFuY2Uuezpicjp9XCIgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIllvdSBjb3VsZCBub3cgY2xvc2UgdGhpcyBwYWdlLlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUluZm9Nb2RhbChcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHIoXCJDb25uZWN0aW5nIHN1Y2Nlc3NmdWxseSB3aXRoaW4gb3RoZXIgaW5zdGFuY2VcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE1lc3NhZ2VIZWxwZXIuZm9ybWF0TWVzc2FnZSh0cihtZXNzYWdlKSwgY29ubmVjdF9kYXRhLmFkZHJlc3MpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zZWFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9vdGVyOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICkub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhMb2dDYXRlZ29yeS5DTElFTlQsIHRyKFwiRmFpbGVkIHRvIGV4ZWN1dGUgY29ubmVjdCB3aXRoaW4gb3RoZXIgVGVhV2ViIGluc3RhbmNlLiBVc2luZyB0aGlzIG9uZS4gRXJyb3I6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5MT0FERUQsIHtcclxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb246IGFzeW5jICgpID0+IGhhbmRsZV9jb25uZWN0X3JlcXVlc3QoY29ubmVjdF9kYXRhLCBzZXJ2ZXJfY29ubmVjdGlvbnMuYWN0aXZlX2Nvbm5lY3Rpb25faGFuZGxlcigpIHx8IHNlcnZlcl9jb25uZWN0aW9ucy5zcGF3bl9zZXJ2ZXJfY29ubmVjdGlvbl9oYW5kbGVyKCkpLFxyXG4gICAgICAgICAgICAgICAgbmFtZTogdHIoXCJkZWZhdWx0IHVybCBjb25uZWN0XCIpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihjaGFuZGxlcikge1xyXG4gICAgICAgICAgICAvKiBubyBpbnN0YW5jZSBhdmFpbCwgc28gbGV0cyBtYWtlIHVzIGF2YWlsICovXHJcbiAgICAgICAgICAgIGNoYW5kbGVyLmNhbGxiYWNrX2F2YWlsYWJsZSA9IGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICFzZXR0aW5ncy5zdGF0aWNfZ2xvYmFsKFNldHRpbmdzLktFWV9ESVNBQkxFX01VTFRJX1NFU1NJT04pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2hhbmRsZXIuY2FsbGJhY2tfZXhlY3V0ZSA9IGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgaGFuZGxlX2Nvbm5lY3RfcmVxdWVzdChkYXRhLCBzZXJ2ZXJfY29ubmVjdGlvbnMuc3Bhd25fc2VydmVyX2Nvbm5lY3Rpb25faGFuZGxlcigpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5MT0FERUQsIHRhc2tfdGVhd2ViX3N0YXJ0ZXIpO1xyXG4gICAgfSxcclxuICAgIHByaW9yaXR5OiAxMFxyXG59O1xyXG5cclxuY29uc3QgdGFza19jZXJ0aWZpY2F0ZV9jYWxsYmFjazogbG9hZGVyLlRhc2sgPSB7XHJcbiAgICBuYW1lOiBcImNlcnRpZmljYXRlIGFjY2VwdCB0ZXN0ZXJcIixcclxuICAgIGZ1bmN0aW9uOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgY2VydGlmaWNhdGVfYWNjZXB0ID0gc2V0dGluZ3Muc3RhdGljX2dsb2JhbChTZXR0aW5ncy5LRVlfQ0VSVElGSUNBVEVfQ0FMTEJBQ0ssIHVuZGVmaW5lZCk7XHJcbiAgICAgICAgaWYoY2VydGlmaWNhdGVfYWNjZXB0KSB7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKExvZ0NhdGVnb3J5LklQQywgdHIoXCJVc2luZyB0aGlzIGluc3RhbmNlIGFzIGNlcnRpZmljYXRlIGNhbGxiYWNrLiBJRDogJXNcIiksIGNlcnRpZmljYXRlX2FjY2VwdCk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGJpcGMuZ2V0X2hhbmRsZXIoKS5wb3N0X2NlcnRpZmljYXRlX2FjY3BlY3RlZChjZXJ0aWZpY2F0ZV9hY2NlcHQpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7fSAvL0ZJWE1FIHJlbW92ZSFcclxuICAgICAgICAgICAgICAgIGxvZy5pbmZvKExvZ0NhdGVnb3J5LklQQywgdHIoXCJPdGhlciBpbnN0YW5jZSBoYXMgYWNrbm93bGVkZ2VkIG91dCB3b3JrLiBDbG9zaW5nIHRoaXMgd2luZG93LlwiKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2Vjb25kc190YWcgPSAkLnNwYXduKFwiYVwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc2Vjb25kcyA9IDU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW50ZXJ2YWxfaWQ7XHJcbiAgICAgICAgICAgICAgICBpbnRlcnZhbF9pZCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBzZWNvbmRzLS07XHJcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kc190YWcudGV4dChzZWNvbmRzLnRvU3RyaW5nKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZihzZWNvbmRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGludGVydmFsX2lkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuR0VORVJBTCwgdHIoXCJDbG9zaW5nIHdpbmRvd1wiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9XHJcbiAgICAgICAgICAgICAgICAgICAgXCJZb3UndmUgc3VjY2Vzc2Z1bGx5IGFjY2VwdGVkIHRoZSBjZXJ0aWZpY2F0ZS57OmJyOn1cIiArXHJcbiAgICAgICAgICAgICAgICAgICAgXCJUaGlzIHBhZ2Ugd2lsbCBjbG9zZSBpbiB7MH0gc2Vjb25kcy5cIjtcclxuICAgICAgICAgICAgICAgIGNyZWF0ZUluZm9Nb2RhbChcclxuICAgICAgICAgICAgICAgICAgICB0cihcIkNlcnRpZmljYXRlIGFjY2NlcHRlZCBzdWNjZXNzZnVsbHlcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgTWVzc2FnZUhlbHBlci5mb3JtYXRNZXNzYWdlKHRyKG1lc3NhZ2UpLCBzZWNvbmRzX3RhZyksXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZWFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb290ZXI6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICkub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cud2FybihMb2dDYXRlZ29yeS5JUEMsIHRyKFwiRmFpbGVkIHRvIHN1Y2Nlc3NmdWxseSBwb3N0IGNlcnRpZmljYXRlIGFjY2VwdCBzdGF0dXM6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsb2cuaW5mbyhMb2dDYXRlZ29yeS5JUEMsIHRyKFwiV2UncmUgbm90IHVzZWQgdG8gYWNjZXB0IGNlcnRpZmljYXRlZC4gQm9vdGluZyBhcHAuXCIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5MT0FERUQsIHRhc2tfY29ubmVjdF9oYW5kbGVyKTtcclxuICAgIH0sXHJcbiAgICBwcmlvcml0eTogMTBcclxufTtcclxuXHJcbmxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5KQVZBU0NSSVBUX0lOSVRJQUxJWklORywge1xyXG4gICAgbmFtZTogXCJqcmVuZGVyZSBpbml0aWFsaXplXCIsXHJcbiAgICBmdW5jdGlvbjogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmKCFzZXR1cF9qc3JlbmRlcigpKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJpbnZhbGlkIGxvYWRcIjtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBsb2FkZXIuY3JpdGljYWxfZXJyb3IodHIoXCJGYWlsZWQgdG8gc2V0dXAganNyZW5kZXJcIikpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHRyKFwiRmFpbGVkIHRvIGxvYWQganNyZW5kZXIhICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgcHJpb3JpdHk6IDEwMFxyXG59KTtcclxuXHJcbmxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5KQVZBU0NSSVBUX0lOSVRJQUxJWklORywge1xyXG4gICAgbmFtZTogXCJhcHAgc3RhcnRlclwiLFxyXG4gICAgZnVuY3Rpb246IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBpZihhcHAuaXNfd2ViKCkpIHtcclxuICAgICAgICAgICAgICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5MT0FERUQsIHRhc2tfY2VydGlmaWNhdGVfY2FsbGJhY2spO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbG9hZGVyLnJlZ2lzdGVyX3Rhc2sobG9hZGVyLlN0YWdlLkxPQURFRCwgdGFza190ZWF3ZWJfc3RhcnRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICBpZihleCBpbnN0YW5jZW9mIEVycm9yIHx8IHR5cGVvZihleC5zdGFjaykgIT09IFwidW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCh0ciB8fCAobXNnID0+IG1zZykpKFwiQ3JpdGljYWwgZXJyb3Igc3RhY2sgdHJhY2U6ICVvXCIpLCBleC5zdGFjayk7XHJcblxyXG4gICAgICAgICAgICBpZihleCBpbnN0YW5jZW9mIFJlZmVyZW5jZUVycm9yIHx8IGV4IGluc3RhbmNlb2YgVHlwZUVycm9yKVxyXG4gICAgICAgICAgICAgICAgZXggPSBleC5uYW1lICsgXCI6IFwiICsgZXgubWVzc2FnZTtcclxuICAgICAgICAgICAgbG9hZGVyLmNyaXRpY2FsX2Vycm9yKFwiRmFpbGVkIHRvIGJvb3QgYXBwIGZ1bmN0aW9uOjxicj5cIiArIGV4KTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgcHJpb3JpdHk6IDEwMDBcclxufSk7XHJcblxyXG4iLCJpbXBvcnQge01lc3NhZ2VIZWxwZXJ9IGZyb20gXCIuLi91aS9mcmFtZXMvY2hhdFwiO1xyXG5pbXBvcnQge2NyZWF0ZUVycm9yTW9kYWx9IGZyb20gXCIuLi91aS9lbGVtZW50cy9tb2RhbFwiO1xyXG5pbXBvcnQge2d1aWR9IGZyb20gXCIuLi9jcnlwdG8vdWlkXCI7XHJcbmltcG9ydCB7ZGVjb2RlX2lkZW50aXR5LCBJZGVudGl0aWZ5VHlwZSwgSWRlbnRpdHl9IGZyb20gXCIuL0lkZW50aXR5XCI7XHJcbmltcG9ydCB7c3RhdGljX2ZvcnVtX2lkZW50aXR5fSBmcm9tIFwiLi9pZGVudGl0aWVzL1RlYUZvcnVtSWRlbnRpdHlcIjtcclxuaW1wb3J0IHtUZWFTcGVha0lkZW50aXR5fSBmcm9tIFwiLi9pZGVudGl0aWVzL1RlYW1TcGVha0lkZW50aXR5XCI7XHJcbmltcG9ydCB7QWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9ufSBmcm9tIFwiLi4vY29ubmVjdGlvbi9Db25uZWN0aW9uQmFzZVwiO1xyXG5pbXBvcnQge2Nvbm5lY3Rpb259IGZyb20gXCIuLi9jb25uZWN0aW9uL0hhbmRzaGFrZUhhbmRsZXJcIjtcclxuXHJcbmltcG9ydCBIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIgPSBjb25uZWN0aW9uLkhhbmRzaGFrZUlkZW50aXR5SGFuZGxlcjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uUHJvZmlsZSB7XHJcbiAgICBpZDogc3RyaW5nO1xyXG5cclxuICAgIHByb2ZpbGVfbmFtZTogc3RyaW5nO1xyXG4gICAgZGVmYXVsdF91c2VybmFtZTogc3RyaW5nO1xyXG4gICAgZGVmYXVsdF9wYXNzd29yZDogc3RyaW5nO1xyXG5cclxuICAgIHNlbGVjdGVkX2lkZW50aXR5X3R5cGU6IHN0cmluZyA9IFwidW5zZXRcIjtcclxuICAgIGlkZW50aXRpZXM6IHsgW2tleTogc3RyaW5nXTogSWRlbnRpdHkgfSA9IHt9O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmlkID0gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgY29ubmVjdF91c2VybmFtZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRfdXNlcm5hbWUgJiYgdGhpcy5kZWZhdWx0X3VzZXJuYW1lICE9PSBcIkFub3RoZXIgVGVhU3BlYWsgdXNlclwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0X3VzZXJuYW1lO1xyXG5cclxuICAgICAgICBsZXQgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkX2lkZW50aXR5KCk7XHJcbiAgICAgICAgbGV0IG5hbWUgPSBzZWxlY3RlZCA/IHNlbGVjdGVkLmZhbGxiYWNrX25hbWUoKSA6IHVuZGVmaW5lZDtcclxuICAgICAgICByZXR1cm4gbmFtZSB8fCBcIkFub3RoZXIgVGVhU3BlYWsgdXNlclwiO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGVjdGVkX2lkZW50aXR5KGN1cnJlbnRfdHlwZT86IElkZW50aXRpZnlUeXBlKTogSWRlbnRpdHkge1xyXG4gICAgICAgIGlmICghY3VycmVudF90eXBlKVxyXG4gICAgICAgICAgICBjdXJyZW50X3R5cGUgPSB0aGlzLnNlbGVjdGVkX3R5cGUoKTtcclxuXHJcbiAgICAgICAgaWYgKGN1cnJlbnRfdHlwZSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICBpZiAoY3VycmVudF90eXBlID09IElkZW50aXRpZnlUeXBlLlRFQUZPUk8pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0YXRpY19mb3J1bV9pZGVudGl0eSgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90eXBlID09IElkZW50aXRpZnlUeXBlLlRFQU1TUEVBSyB8fCBjdXJyZW50X3R5cGUgPT0gSWRlbnRpdGlmeVR5cGUuTklDS05BTUUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaWRlbnRpdGllc1tJZGVudGl0aWZ5VHlwZVtjdXJyZW50X3R5cGVdLnRvTG93ZXJDYXNlKCldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3RlZF90eXBlPygpOiBJZGVudGl0aWZ5VHlwZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWRfaWRlbnRpdHlfdHlwZSA/IElkZW50aXRpZnlUeXBlW3RoaXMuc2VsZWN0ZWRfaWRlbnRpdHlfdHlwZS50b1VwcGVyQ2FzZSgpXSA6IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRfaWRlbnRpdHkodHlwZTogSWRlbnRpdGlmeVR5cGUsIGlkZW50aXR5OiBJZGVudGl0eSkge1xyXG4gICAgICAgIHRoaXMuaWRlbnRpdGllc1tJZGVudGl0aWZ5VHlwZVt0eXBlXS50b0xvd2VyQ2FzZSgpXSA9IGlkZW50aXR5O1xyXG4gICAgfVxyXG5cclxuICAgIHNwYXduX2lkZW50aXR5X2hhbmRzaGFrZV9oYW5kbGVyPyhjb25uZWN0aW9uOiBBYnN0cmFjdFNlcnZlckNvbm5lY3Rpb24pOiBIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIge1xyXG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gdGhpcy5zZWxlY3RlZF9pZGVudGl0eSgpO1xyXG4gICAgICAgIGlmICghaWRlbnRpdHkpXHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgcmV0dXJuIGlkZW50aXR5LnNwYXduX2lkZW50aXR5X2hhbmRzaGFrZV9oYW5kbGVyKGNvbm5lY3Rpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIGVuY29kZT8oKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBpZGVudGl0eV9kYXRhID0ge307XHJcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5pZGVudGl0aWVzKVxyXG4gICAgICAgICAgICBpZiAodGhpcy5pZGVudGl0aWVzW2tleV0pXHJcbiAgICAgICAgICAgICAgICBpZGVudGl0eV9kYXRhW2tleV0gPSB0aGlzLmlkZW50aXRpZXNba2V5XS5lbmNvZGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgdmVyc2lvbjogMSxcclxuICAgICAgICAgICAgdXNlcm5hbWU6IHRoaXMuZGVmYXVsdF91c2VybmFtZSxcclxuICAgICAgICAgICAgcGFzc3dvcmQ6IHRoaXMuZGVmYXVsdF9wYXNzd29yZCxcclxuICAgICAgICAgICAgcHJvZmlsZV9uYW1lOiB0aGlzLnByb2ZpbGVfbmFtZSxcclxuICAgICAgICAgICAgaWRlbnRpdHlfdHlwZTogdGhpcy5zZWxlY3RlZF9pZGVudGl0eV90eXBlLFxyXG4gICAgICAgICAgICBpZGVudGl0eV9kYXRhOiBpZGVudGl0eV9kYXRhLFxyXG4gICAgICAgICAgICBpZDogdGhpcy5pZFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gdGhpcy5zZWxlY3RlZF9pZGVudGl0eSgpO1xyXG4gICAgICAgIGlmICghaWRlbnRpdHkgfHwgIWlkZW50aXR5LnZhbGlkKCkpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGRlY29kZV9wcm9maWxlKGRhdGEpOiBQcm9taXNlPENvbm5lY3Rpb25Qcm9maWxlIHwgc3RyaW5nPiB7XHJcbiAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgIGlmIChkYXRhLnZlcnNpb24gIT09IDEpXHJcbiAgICAgICAgcmV0dXJuIFwiaW52YWxpZCB2ZXJzaW9uXCI7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0OiBDb25uZWN0aW9uUHJvZmlsZSA9IG5ldyBDb25uZWN0aW9uUHJvZmlsZShkYXRhLmlkKTtcclxuICAgIHJlc3VsdC5kZWZhdWx0X3VzZXJuYW1lID0gZGF0YS51c2VybmFtZTtcclxuICAgIHJlc3VsdC5kZWZhdWx0X3Bhc3N3b3JkID0gZGF0YS5wYXNzd29yZDtcclxuICAgIHJlc3VsdC5wcm9maWxlX25hbWUgPSBkYXRhLnByb2ZpbGVfbmFtZTtcclxuICAgIHJlc3VsdC5zZWxlY3RlZF9pZGVudGl0eV90eXBlID0gKGRhdGEuaWRlbnRpdHlfdHlwZSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgIGlmIChkYXRhLmlkZW50aXR5X2RhdGEpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhLmlkZW50aXR5X2RhdGEpIHtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IElkZW50aXRpZnlUeXBlW2tleS50b1VwcGVyQ2FzZSgpIGFzIHN0cmluZ107XHJcbiAgICAgICAgICAgIGNvbnN0IF9kYXRhID0gZGF0YS5pZGVudGl0eV9kYXRhW2tleV07XHJcbiAgICAgICAgICAgIGlmICh0eXBlID09IHVuZGVmaW5lZCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpZGVudGl0eSA9IGF3YWl0IGRlY29kZV9pZGVudGl0eSh0eXBlLCBfZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChpZGVudGl0eSA9PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgcmVzdWx0LmlkZW50aXRpZXNba2V5LnRvTG93ZXJDYXNlKCldID0gaWRlbnRpdHk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmludGVyZmFjZSBQcm9maWxlc0RhdGEge1xyXG4gICAgdmVyc2lvbjogbnVtYmVyO1xyXG4gICAgcHJvZmlsZXM6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5sZXQgYXZhaWxhYmxlX3Byb2ZpbGVzOiBDb25uZWN0aW9uUHJvZmlsZVtdID0gW107XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZCgpIHtcclxuICAgIGF2YWlsYWJsZV9wcm9maWxlcyA9IFtdO1xyXG5cclxuICAgIGNvbnN0IHByb2ZpbGVzX2pzb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInByb2ZpbGVzXCIpO1xyXG4gICAgbGV0IHByb2ZpbGVzX2RhdGE6IFByb2ZpbGVzRGF0YSA9ICgoKSA9PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHByb2ZpbGVzX2pzb24gPyBKU09OLnBhcnNlKHByb2ZpbGVzX2pzb24pIDoge3ZlcnNpb246IDB9IGFzIGFueTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBkZWJ1Z2dlcjtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0cihcIkludmFsaWQgcHJvZmlsZSBqc29uISBSZXNldHRpbmcgcHJvZmlsZXMgOiggKCVvKVwiKSwgcHJvZmlsZXNfanNvbik7XHJcbiAgICAgICAgICAgIGNyZWF0ZUVycm9yTW9kYWwodHIoXCJQcm9maWxlIGRhdGEgaW52YWxpZFwiKSwgTWVzc2FnZUhlbHBlci5mb3JtYXRNZXNzYWdlKHRyKFwiVGhlIHByb2ZpbGUgZGF0YSBpcyBpbnZhbGlkLns6YnI6fVRoaXMgbWlnaHQgY2F1c2UgZGF0YSBsb3NzLlwiKSkpLm9wZW4oKTtcclxuICAgICAgICAgICAgcmV0dXJuIHt2ZXJzaW9uOiAwfTtcclxuICAgICAgICB9XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIGlmIChwcm9maWxlc19kYXRhLnZlcnNpb24gPT09IDApIHtcclxuICAgICAgICBwcm9maWxlc19kYXRhID0ge1xyXG4gICAgICAgICAgICB2ZXJzaW9uOiAxLFxyXG4gICAgICAgICAgICBwcm9maWxlczogW11cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgaWYgKHByb2ZpbGVzX2RhdGEudmVyc2lvbiA9PSAxKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBwcm9maWxlX2RhdGEgb2YgcHJvZmlsZXNfZGF0YS5wcm9maWxlcykge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9maWxlID0gYXdhaXQgZGVjb2RlX3Byb2ZpbGUocHJvZmlsZV9kYXRhKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiAocHJvZmlsZSkgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKHRyKFwiRmFpbGVkIHRvIGxvYWQgcHJvZmlsZS4gUmVhc29uOiAlcywgUHJvZmlsZSBkYXRhOiAlc1wiKSwgcHJvZmlsZSwgcHJvZmlsZXNfZGF0YSk7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhdmFpbGFibGVfcHJvZmlsZXMucHVzaChwcm9maWxlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFmaW5kX3Byb2ZpbGUoXCJkZWZhdWx0XCIpKSB7IC8vQ3JlYXRlIGEgZGVmYXVsdCBwcm9maWxlIGFuZCB0ZWFmb3JvIHByb2ZpbGVcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2ZpbGUgPSBjcmVhdGVfbmV3X3Byb2ZpbGUoXCJkZWZhdWx0XCIsIFwiZGVmYXVsdFwiKTtcclxuICAgICAgICAgICAgcHJvZmlsZS5kZWZhdWx0X3Bhc3N3b3JkID0gXCJcIjtcclxuICAgICAgICAgICAgcHJvZmlsZS5kZWZhdWx0X3VzZXJuYW1lID0gXCJcIjtcclxuICAgICAgICAgICAgcHJvZmlsZS5wcm9maWxlX25hbWUgPSBcIkRlZmF1bHQgUHJvZmlsZVwiO1xyXG5cclxuICAgICAgICAgICAgLyogZ2VuZXJhdGUgZGVmYXVsdCBpZGVudGl0eSAqL1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWRlbnRpdHkgPSBhd2FpdCBUZWFTcGVha0lkZW50aXR5LmdlbmVyYXRlX25ldygpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgaWRlbnRpdHkuaW1wcm92ZV9sZXZlbCg4LCAxLCAoKSA9PiBhY3RpdmUpO1xyXG4gICAgICAgICAgICAgICAgcHJvZmlsZS5zZXRfaWRlbnRpdHkoSWRlbnRpdGlmeVR5cGUuVEVBTVNQRUFLLCBpZGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICBwcm9maWxlLnNlbGVjdGVkX2lkZW50aXR5X3R5cGUgPSBJZGVudGl0aWZ5VHlwZVtJZGVudGl0aWZ5VHlwZS5URUFNU1BFQUtdO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY3JlYXRlRXJyb3JNb2RhbCh0cihcIkZhaWxlZCB0byBnZW5lcmF0ZSBkZWZhdWx0IGlkZW50aXR5XCIpLCB0cihcIkZhaWxlZCB0byBnZW5lcmF0ZSBkZWZhdWx0IGlkZW50aXR5ITxicj5QbGVhc2UgbWFudWFsbHkgZ2VuZXJhdGUgdGhlIGlkZW50aXR5IHdpdGhpbiB5b3VyIHNldHRpbmdzID0+IHByb2ZpbGVzXCIpKS5vcGVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHsgLyogZm9ydW0gaWRlbnRpdHkgKHdvcmtzIG9ubHkgd2hlbiBjb25uZWN0ZWQgdG8gdGhlIGZvcnVtKSAqL1xyXG4gICAgICAgICAgICBjb25zdCBwcm9maWxlID0gY3JlYXRlX25ld19wcm9maWxlKFwiVGVhU3BlYWsgRm9ydW1cIiwgXCJ0ZWFmb3JvXCIpO1xyXG4gICAgICAgICAgICBwcm9maWxlLmRlZmF1bHRfcGFzc3dvcmQgPSBcIlwiO1xyXG4gICAgICAgICAgICBwcm9maWxlLmRlZmF1bHRfdXNlcm5hbWUgPSBcIlwiO1xyXG4gICAgICAgICAgICBwcm9maWxlLnByb2ZpbGVfbmFtZSA9IFwiVGVhU3BlYWsgRm9ydW0gcHJvZmlsZVwiO1xyXG5cclxuICAgICAgICAgICAgcHJvZmlsZS5zZXRfaWRlbnRpdHkoSWRlbnRpdGlmeVR5cGUuVEVBRk9STywgc3RhdGljX2ZvcnVtX2lkZW50aXR5KCkpO1xyXG4gICAgICAgICAgICBwcm9maWxlLnNlbGVjdGVkX2lkZW50aXR5X3R5cGUgPSBJZGVudGl0aWZ5VHlwZVtJZGVudGl0aWZ5VHlwZS5URUFGT1JPXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNhdmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9uZXdfcHJvZmlsZShuYW1lOiBzdHJpbmcsIGlkPzogc3RyaW5nKTogQ29ubmVjdGlvblByb2ZpbGUge1xyXG4gICAgY29uc3QgcHJvZmlsZSA9IG5ldyBDb25uZWN0aW9uUHJvZmlsZShpZCB8fCBndWlkKCkpO1xyXG4gICAgcHJvZmlsZS5wcm9maWxlX25hbWUgPSBuYW1lO1xyXG4gICAgcHJvZmlsZS5kZWZhdWx0X3VzZXJuYW1lID0gXCJcIjtcclxuICAgIGF2YWlsYWJsZV9wcm9maWxlcy5wdXNoKHByb2ZpbGUpO1xyXG4gICAgcmV0dXJuIHByb2ZpbGU7XHJcbn1cclxuXHJcbmxldCBfcmVxdWlyZXNfc2F2ZSA9IGZhbHNlO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUoKSB7XHJcbiAgICBjb25zdCBwcm9maWxlczogc3RyaW5nW10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgcHJvZmlsZSBvZiBhdmFpbGFibGVfcHJvZmlsZXMpXHJcbiAgICAgICAgcHJvZmlsZXMucHVzaChwcm9maWxlLmVuY29kZSgpKTtcclxuXHJcbiAgICBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHZlcnNpb246IDEsXHJcbiAgICAgICAgcHJvZmlsZXM6IHByb2ZpbGVzXHJcbiAgICB9KTtcclxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicHJvZmlsZXNcIiwgZGF0YSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXJrX25lZWRfc2F2ZSgpIHtcclxuICAgIF9yZXF1aXJlc19zYXZlID0gdHJ1ZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlcXVpcmVzX3NhdmUoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gX3JlcXVpcmVzX3NhdmU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwcm9maWxlcygpOiBDb25uZWN0aW9uUHJvZmlsZVtdIHtcclxuICAgIHJldHVybiBhdmFpbGFibGVfcHJvZmlsZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kX3Byb2ZpbGUoaWQ6IHN0cmluZyk6IENvbm5lY3Rpb25Qcm9maWxlIHwgdW5kZWZpbmVkIHtcclxuICAgIGZvciAoY29uc3QgcHJvZmlsZSBvZiBwcm9maWxlcygpKVxyXG4gICAgICAgIGlmIChwcm9maWxlLmlkID09IGlkKVxyXG4gICAgICAgICAgICByZXR1cm4gcHJvZmlsZTtcclxuXHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmluZF9wcm9maWxlX2J5X25hbWUobmFtZTogc3RyaW5nKTogQ29ubmVjdGlvblByb2ZpbGUgfCB1bmRlZmluZWQge1xyXG4gICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgIGZvciAoY29uc3QgcHJvZmlsZSBvZiBwcm9maWxlcygpKVxyXG4gICAgICAgIGlmICgocHJvZmlsZS5wcm9maWxlX25hbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKSA9PSBuYW1lKVxyXG4gICAgICAgICAgICByZXR1cm4gcHJvZmlsZTtcclxuXHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRfcHJvZmlsZSgpOiBDb25uZWN0aW9uUHJvZmlsZSB7XHJcbiAgICByZXR1cm4gZmluZF9wcm9maWxlKFwiZGVmYXVsdFwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldF9kZWZhdWx0X3Byb2ZpbGUocHJvZmlsZTogQ29ubmVjdGlvblByb2ZpbGUpIHtcclxuICAgIGNvbnN0IG9sZF9kZWZhdWx0ID0gZGVmYXVsdF9wcm9maWxlKCk7XHJcbiAgICBpZiAob2xkX2RlZmF1bHQgJiYgb2xkX2RlZmF1bHQgIT0gcHJvZmlsZSkge1xyXG4gICAgICAgIG9sZF9kZWZhdWx0LmlkID0gZ3VpZCgpO1xyXG4gICAgfVxyXG4gICAgcHJvZmlsZS5pZCA9IFwiZGVmYXVsdFwiO1xyXG4gICAgcmV0dXJuIG9sZF9kZWZhdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlX3Byb2ZpbGUocHJvZmlsZTogQ29ubmVjdGlvblByb2ZpbGUpIHtcclxuICAgIGF2YWlsYWJsZV9wcm9maWxlcy5yZW1vdmUocHJvZmlsZSk7XHJcbn0iLCJpbXBvcnQge0Fic3RyYWN0Q29tbWFuZEhhbmRsZXIsIEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbiwgU2VydmVyQ29tbWFuZH0gZnJvbSBcIi4uL2Nvbm5lY3Rpb24vQ29ubmVjdGlvbkJhc2VcIjtcclxuaW1wb3J0IHtjb25uZWN0aW9ufSBmcm9tIFwiLi4vY29ubmVjdGlvbi9IYW5kc2hha2VIYW5kbGVyXCI7XHJcblxyXG5pbXBvcnQgSGFuZHNoYWtlSWRlbnRpdHlIYW5kbGVyID0gY29ubmVjdGlvbi5IYW5kc2hha2VJZGVudGl0eUhhbmRsZXI7XHJcbmltcG9ydCB7TmFtZUlkZW50aXR5fSBmcm9tIFwiLi9pZGVudGl0aWVzL05hbWVJZGVudGl0eVwiO1xyXG5pbXBvcnQge1RlYUZvcnVtSWRlbnRpdHl9IGZyb20gXCIuL2lkZW50aXRpZXMvVGVhRm9ydW1JZGVudGl0eVwiO1xyXG5pbXBvcnQge1RlYVNwZWFrSWRlbnRpdHl9IGZyb20gXCIuL2lkZW50aXRpZXMvVGVhbVNwZWFrSWRlbnRpdHlcIjtcclxuXHJcbmV4cG9ydCBlbnVtIElkZW50aXRpZnlUeXBlIHtcclxuICAgIFRFQUZPUk8sXHJcbiAgICBURUFNU1BFQUssXHJcbiAgICBOSUNLTkFNRVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElkZW50aXR5IHtcclxuICAgIGZhbGxiYWNrX25hbWUoKTogc3RyaW5nIHwgdW5kZWZpbmVkIDtcclxuICAgIHVpZCgpIDogc3RyaW5nO1xyXG4gICAgdHlwZSgpIDogSWRlbnRpdGlmeVR5cGU7XHJcblxyXG4gICAgdmFsaWQoKSA6IGJvb2xlYW47XHJcblxyXG4gICAgZW5jb2RlPygpIDogc3RyaW5nO1xyXG4gICAgZGVjb2RlKGRhdGE6IHN0cmluZykgOiBQcm9taXNlPHZvaWQ+O1xyXG5cclxuICAgIHNwYXduX2lkZW50aXR5X2hhbmRzaGFrZV9oYW5kbGVyKGNvbm5lY3Rpb246IEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbikgOiBIYW5kc2hha2VJZGVudGl0eUhhbmRsZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWNvZGVfaWRlbnRpdHkodHlwZTogSWRlbnRpdGlmeVR5cGUsIGRhdGE6IHN0cmluZykgOiBQcm9taXNlPElkZW50aXR5PiB7XHJcbiAgICBsZXQgaWRlbnRpdHk6IElkZW50aXR5O1xyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgY2FzZSBJZGVudGl0aWZ5VHlwZS5OSUNLTkFNRTpcclxuICAgICAgICAgICAgaWRlbnRpdHkgPSBuZXcgTmFtZUlkZW50aXR5KCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgSWRlbnRpdGlmeVR5cGUuVEVBRk9STzpcclxuICAgICAgICAgICAgaWRlbnRpdHkgPSBuZXcgVGVhRm9ydW1JZGVudGl0eSh1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIElkZW50aXRpZnlUeXBlLlRFQU1TUEVBSzpcclxuICAgICAgICAgICAgaWRlbnRpdHkgPSBuZXcgVGVhU3BlYWtJZGVudGl0eSh1bmRlZmluZWQsIHVuZGVmaW5lZCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgaWYoIWlkZW50aXR5KVxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBpZGVudGl0eS5kZWNvZGUoZGF0YSlcclxuICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAvKiB0b2RvIGJldHRlciBlcnJvciBoYW5kbGluZyEgKi9cclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpZGVudGl0eTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9pZGVudGl0eSh0eXBlOiBJZGVudGl0aWZ5VHlwZSkge1xyXG4gICAgbGV0IGlkZW50aXR5OiBJZGVudGl0eTtcclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgIGNhc2UgSWRlbnRpdGlmeVR5cGUuTklDS05BTUU6XHJcbiAgICAgICAgICAgIGlkZW50aXR5ID0gbmV3IE5hbWVJZGVudGl0eSgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIElkZW50aXRpZnlUeXBlLlRFQUZPUk86XHJcbiAgICAgICAgICAgIGlkZW50aXR5ID0gbmV3IFRlYUZvcnVtSWRlbnRpdHkodW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBJZGVudGl0aWZ5VHlwZS5URUFNU1BFQUs6XHJcbiAgICAgICAgICAgIGlkZW50aXR5ID0gbmV3IFRlYVNwZWFrSWRlbnRpdHkodW5kZWZpbmVkLCB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHJldHVybiBpZGVudGl0eTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEhhbmRzaGFrZUNvbW1hbmRIYW5kbGVyPFQgZXh0ZW5kcyBBYnN0cmFjdEhhbmRzaGFrZUlkZW50aXR5SGFuZGxlcj4gZXh0ZW5kcyBBYnN0cmFjdENvbW1hbmRIYW5kbGVyIHtcclxuICAgIHJlYWRvbmx5IGhhbmRsZTogVDtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uZWN0aW9uOiBBYnN0cmFjdFNlcnZlckNvbm5lY3Rpb24sIGhhbmRsZTogVCkge1xyXG4gICAgICAgIHN1cGVyKGNvbm5lY3Rpb24pO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlID0gaGFuZGxlO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBoYW5kbGVfY29tbWFuZChjb21tYW5kOiBTZXJ2ZXJDb21tYW5kKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYoJC5pc0Z1bmN0aW9uKHRoaXNbY29tbWFuZC5jb21tYW5kXSkpXHJcbiAgICAgICAgICAgIHRoaXNbY29tbWFuZC5jb21tYW5kXShjb21tYW5kLmFyZ3VtZW50cyk7XHJcbiAgICAgICAgZWxzZSBpZihjb21tYW5kLmNvbW1hbmQgPT0gXCJlcnJvclwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4odHIoXCJSZWNlaXZlZCB1bmtub3duIGNvbW1hbmQgd2hpbGUgaGFuZHNoYWtpbmcgKCVvKVwiKSwgY29tbWFuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIgaW1wbGVtZW50cyBjb25uZWN0aW9uLkhhbmRzaGFrZUlkZW50aXR5SGFuZGxlciB7XHJcbiAgICBjb25uZWN0aW9uOiBBYnN0cmFjdFNlcnZlckNvbm5lY3Rpb247XHJcblxyXG4gICAgcHJvdGVjdGVkIGNhbGxiYWNrczogKChzdWNjZXNzOiBib29sZWFuLCBtZXNzYWdlPzogc3RyaW5nKSA9PiBhbnkpW10gPSBbXTtcclxuXHJcbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICByZWdpc3Rlcl9jYWxsYmFjayhjYWxsYmFjazogKHN1Y2Nlc3M6IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcpID0+IGFueSkge1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xyXG4gICAgfVxyXG5cclxuICAgIGFic3RyYWN0IHN0YXJ0X2hhbmRzaGFrZSgpO1xyXG5cclxuICAgIHByb3RlY3RlZCB0cmlnZ2VyX3N1Y2Nlc3MoKSB7XHJcbiAgICAgICAgZm9yKGNvbnN0IGNhbGxiYWNrIG9mIHRoaXMuY2FsbGJhY2tzKVxyXG4gICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgdHJpZ2dlcl9mYWlsKG1lc3NhZ2U6IHN0cmluZykge1xyXG4gICAgICAgIGZvcihjb25zdCBjYWxsYmFjayBvZiB0aGlzLmNhbGxiYWNrcylcclxuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIG1lc3NhZ2UpO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHtDb21tYW5kUmVzdWx0fSBmcm9tIFwiLi4vLi4vY29ubmVjdGlvbi9TZXJ2ZXJDb25uZWN0aW9uRGVjbGFyYXRpb25cIjtcclxuaW1wb3J0IHtsb2csIExvZ0NhdGVnb3J5fSBmcm9tIFwiLi4vLi4vbG9nXCI7XHJcbmltcG9ydCB7QWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9ufSBmcm9tIFwiLi4vLi4vY29ubmVjdGlvbi9Db25uZWN0aW9uQmFzZVwiO1xyXG5pbXBvcnQge2Nvbm5lY3Rpb259IGZyb20gXCIuLi8uLi9jb25uZWN0aW9uL0hhbmRzaGFrZUhhbmRsZXJcIjtcclxuXHJcbmltcG9ydCBIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIgPSBjb25uZWN0aW9uLkhhbmRzaGFrZUlkZW50aXR5SGFuZGxlcjtcclxuaW1wb3J0IHtBYnN0cmFjdEhhbmRzaGFrZUlkZW50aXR5SGFuZGxlciwgSGFuZHNoYWtlQ29tbWFuZEhhbmRsZXIsIElkZW50aXRpZnlUeXBlLCBJZGVudGl0eX0gZnJvbSBcIi4uL0lkZW50aXR5XCI7XHJcblxyXG5jbGFzcyBOYW1lSGFuZHNoYWtlSGFuZGxlciBleHRlbmRzIEFic3RyYWN0SGFuZHNoYWtlSWRlbnRpdHlIYW5kbGVyIHtcclxuICAgIHJlYWRvbmx5IGlkZW50aXR5OiBOYW1lSWRlbnRpdHk7XHJcbiAgICBoYW5kbGVyOiBIYW5kc2hha2VDb21tYW5kSGFuZGxlcjxOYW1lSGFuZHNoYWtlSGFuZGxlcj47XHJcblxyXG4gICAgY29uc3RydWN0b3IoY29ubmVjdGlvbjogQWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9uLCBpZGVudGl0eTogTmFtZUlkZW50aXR5KSB7XHJcbiAgICAgICAgc3VwZXIoY29ubmVjdGlvbik7XHJcbiAgICAgICAgdGhpcy5pZGVudGl0eSA9IGlkZW50aXR5O1xyXG5cclxuICAgICAgICB0aGlzLmhhbmRsZXIgPSBuZXcgSGFuZHNoYWtlQ29tbWFuZEhhbmRsZXIoY29ubmVjdGlvbiwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVyW1wiaGFuZHNoYWtlaWRlbnRpdHlwcm9vZlwiXSA9ICgpID0+IHRoaXMudHJpZ2dlcl9mYWlsKFwic2VydmVyIHJlcXVlc3RlZCB1bmV4cGVjdGVkIHByb29mXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0X2hhbmRzaGFrZSgpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS5yZWdpc3Rlcl9oYW5kbGVyKHRoaXMuaGFuZGxlcik7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcImhhbmRzaGFrZWJlZ2luXCIsIHtcclxuICAgICAgICAgICAgaW50ZW50aW9uOiAwLFxyXG4gICAgICAgICAgICBhdXRoZW50aWNhdGlvbl9tZXRob2Q6IHRoaXMuaWRlbnRpdHkudHlwZSgpLFxyXG4gICAgICAgICAgICBjbGllbnRfbmlja25hbWU6IHRoaXMuaWRlbnRpdHkubmFtZSgpXHJcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgdHIoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBuYW1lIGJhc2VkIGhhbmRzaGFrZS4gRXJyb3I6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgQ29tbWFuZFJlc3VsdClcclxuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyb3IuZXh0cmFfbWVzc2FnZSB8fCBlcnJvci5tZXNzYWdlO1xyXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJfZmFpbChcImZhaWxlZCB0byBleGVjdXRlIGJlZ2luIChcIiArIGVycm9yICsgXCIpXCIpO1xyXG4gICAgICAgIH0pLnRoZW4oKCkgPT4gdGhpcy50cmlnZ2VyX3N1Y2Nlc3MoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHRyaWdnZXJfZmFpbChtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcy5oYW5kbGVyKTtcclxuICAgICAgICBzdXBlci50cmlnZ2VyX2ZhaWwobWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHRyaWdnZXJfc3VjY2VzcygpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcy5oYW5kbGVyKTtcclxuICAgICAgICBzdXBlci50cmlnZ2VyX3N1Y2Nlc3MoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE5hbWVJZGVudGl0eSBpbXBsZW1lbnRzIElkZW50aXR5IHtcclxuICAgIHByaXZhdGUgX25hbWU6IHN0cmluZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lPzogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5fbmFtZSA9IG5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0X25hbWUobmFtZTogc3RyaW5nKSB7IHRoaXMuX25hbWUgPSBuYW1lOyB9XHJcblxyXG4gICAgbmFtZSgpIDogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX25hbWU7IH1cclxuXHJcbiAgICBmYWxsYmFja19uYW1lKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX25hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgdWlkKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGJ0b2EodGhpcy5fbmFtZSk7IC8vRklYTUUgaGFzaCFcclxuICAgIH1cclxuXHJcbiAgICB0eXBlKCk6IElkZW50aXRpZnlUeXBlIHtcclxuICAgICAgICByZXR1cm4gSWRlbnRpdGlmeVR5cGUuTklDS05BTUU7XHJcbiAgICB9XHJcblxyXG4gICAgdmFsaWQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX25hbWUgIT0gdW5kZWZpbmVkICYmIHRoaXMuX25hbWUubGVuZ3RoID49IDU7XHJcbiAgICB9XHJcblxyXG4gICAgZGVjb2RlKGRhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XHJcbiAgICAgICAgaWYoZGF0YS52ZXJzaW9uICE9PSAxKVxyXG4gICAgICAgICAgICB0aHJvdyBcImludmFsaWQgdmVyc2lvblwiO1xyXG5cclxuICAgICAgICB0aGlzLl9uYW1lID0gZGF0YVtcIm5hbWVcIl07XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGVuY29kZT8oKSA6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgdmVyc2lvbjogMSxcclxuICAgICAgICAgICAgbmFtZTogdGhpcy5fbmFtZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNwYXduX2lkZW50aXR5X2hhbmRzaGFrZV9oYW5kbGVyKGNvbm5lY3Rpb246IEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbikgOiBIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgTmFtZUhhbmRzaGFrZUhhbmRsZXIoY29ubmVjdGlvbiwgdGhpcyk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQge0Fic3RyYWN0U2VydmVyQ29ubmVjdGlvbn0gZnJvbSBcIi4uLy4uL2Nvbm5lY3Rpb24vQ29ubmVjdGlvbkJhc2VcIjtcclxuaW1wb3J0IHtsb2csIExvZ0NhdGVnb3J5fSBmcm9tIFwiLi4vLi4vbG9nXCI7XHJcbmltcG9ydCB7Q29tbWFuZFJlc3VsdH0gZnJvbSBcIi4uLy4uL2Nvbm5lY3Rpb24vU2VydmVyQ29ubmVjdGlvbkRlY2xhcmF0aW9uXCI7XHJcbmltcG9ydCB7Zm9ydW19IGZyb20gXCIuL3RlYXNwZWFrLWZvcnVtXCI7XHJcbmltcG9ydCB7Y29ubmVjdGlvbn0gZnJvbSBcIi4uLy4uL2Nvbm5lY3Rpb24vSGFuZHNoYWtlSGFuZGxlclwiO1xyXG5pbXBvcnQgSGFuZHNoYWtlSWRlbnRpdHlIYW5kbGVyID0gY29ubmVjdGlvbi5IYW5kc2hha2VJZGVudGl0eUhhbmRsZXI7XHJcbmltcG9ydCB7QWJzdHJhY3RIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIsIEhhbmRzaGFrZUNvbW1hbmRIYW5kbGVyLCBJZGVudGl0aWZ5VHlwZSwgSWRlbnRpdHl9IGZyb20gXCIuLi9JZGVudGl0eVwiO1xyXG5cclxuY2xhc3MgVGVhRm9ydW1IYW5kc2hha2VIYW5kbGVyIGV4dGVuZHMgQWJzdHJhY3RIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIge1xyXG4gICAgcmVhZG9ubHkgaWRlbnRpdHk6IFRlYUZvcnVtSWRlbnRpdHk7XHJcbiAgICBoYW5kbGVyOiBIYW5kc2hha2VDb21tYW5kSGFuZGxlcjxUZWFGb3J1bUhhbmRzaGFrZUhhbmRsZXI+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbiwgaWRlbnRpdHk6IFRlYUZvcnVtSWRlbnRpdHkpIHtcclxuICAgICAgICBzdXBlcihjb25uZWN0aW9uKTtcclxuICAgICAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHk7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVyID0gbmV3IEhhbmRzaGFrZUNvbW1hbmRIYW5kbGVyKGNvbm5lY3Rpb24sIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlcltcImhhbmRzaGFrZWlkZW50aXR5cHJvb2ZcIl0gPSB0aGlzLmhhbmRsZV9wcm9vZi5iaW5kKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0X2hhbmRzaGFrZSgpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS5yZWdpc3Rlcl9oYW5kbGVyKHRoaXMuaGFuZGxlcik7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcImhhbmRzaGFrZWJlZ2luXCIsIHtcclxuICAgICAgICAgICAgaW50ZW50aW9uOiAwLFxyXG4gICAgICAgICAgICBhdXRoZW50aWNhdGlvbl9tZXRob2Q6IHRoaXMuaWRlbnRpdHkudHlwZSgpLFxyXG4gICAgICAgICAgICBkYXRhOiB0aGlzLmlkZW50aXR5LmRhdGEoKS5kYXRhX2pzb24oKVxyXG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5LklERU5USVRJRVMsIHRyKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgVGVhRm9ydW0gYmFzZWQgaGFuZHNoYWtlLiBFcnJvcjogJW9cIiksIGVycm9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgQ29tbWFuZFJlc3VsdClcclxuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyb3IuZXh0cmFfbWVzc2FnZSB8fCBlcnJvci5tZXNzYWdlO1xyXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJfZmFpbChcImZhaWxlZCB0byBleGVjdXRlIGJlZ2luIChcIiArIGVycm9yICsgXCIpXCIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZV9wcm9vZihqc29uKSB7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcImhhbmRzaGFrZWluZGVudGl0eXByb29mXCIsIHtcclxuICAgICAgICAgICAgcHJvb2Y6IHRoaXMuaWRlbnRpdHkuZGF0YSgpLmRhdGFfc2lnbigpXHJcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgdHIoXCJGYWlsZWQgdG8gcHJvb2YgdGhlIGlkZW50aXR5LiBFcnJvcjogJW9cIiksIGVycm9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgQ29tbWFuZFJlc3VsdClcclxuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyb3IuZXh0cmFfbWVzc2FnZSB8fCBlcnJvci5tZXNzYWdlO1xyXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJfZmFpbChcImZhaWxlZCB0byBleGVjdXRlIHByb29mIChcIiArIGVycm9yICsgXCIpXCIpO1xyXG4gICAgICAgIH0pLnRoZW4oKCkgPT4gdGhpcy50cmlnZ2VyX3N1Y2Nlc3MoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHRyaWdnZXJfZmFpbChtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcy5oYW5kbGVyKTtcclxuICAgICAgICBzdXBlci50cmlnZ2VyX2ZhaWwobWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHRyaWdnZXJfc3VjY2VzcygpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcy5oYW5kbGVyKTtcclxuICAgICAgICBzdXBlci50cmlnZ2VyX3N1Y2Nlc3MoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRlYUZvcnVtSWRlbnRpdHkgaW1wbGVtZW50cyBJZGVudGl0eSB7XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGlkZW50aXR5X2RhdGE6IGZvcnVtLkRhdGE7XHJcblxyXG4gICAgdmFsaWQoKSA6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAhIXRoaXMuaWRlbnRpdHlfZGF0YSAmJiAhdGhpcy5pZGVudGl0eV9kYXRhLmlzX2V4cGlyZWQoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihkYXRhOiBmb3J1bS5EYXRhKSB7XHJcbiAgICAgICAgdGhpcy5pZGVudGl0eV9kYXRhID0gZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBkYXRhKCkgOiBmb3J1bS5EYXRhIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pZGVudGl0eV9kYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIGRlY29kZShkYXRhKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgICAgIGlmKGRhdGEudmVyc2lvbiAhPT0gMSlcclxuICAgICAgICAgICAgdGhyb3cgXCJpbnZhbGlkIHZlcnNpb25cIjtcclxuXHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGVuY29kZSgpIDogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICB2ZXJzaW9uOiAxXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3Bhd25faWRlbnRpdHlfaGFuZHNoYWtlX2hhbmRsZXIoY29ubmVjdGlvbjogQWJzdHJhY3RTZXJ2ZXJDb25uZWN0aW9uKSA6IEhhbmRzaGFrZUlkZW50aXR5SGFuZGxlciB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUZWFGb3J1bUhhbmRzaGFrZUhhbmRsZXIoY29ubmVjdGlvbiwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgZmFsbGJhY2tfbmFtZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmlkZW50aXR5X2RhdGEgPyB0aGlzLmlkZW50aXR5X2RhdGEubmFtZSgpIDogdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIHR5cGUoKTogSWRlbnRpdGlmeVR5cGUge1xyXG4gICAgICAgIHJldHVybiBJZGVudGl0aWZ5VHlwZS5URUFGT1JPO1xyXG4gICAgfVxyXG5cclxuICAgIHVpZCgpOiBzdHJpbmcge1xyXG4gICAgICAgIC8vRklYTUU6IFJlYWwgVUlEIVxyXG4gICAgICAgIHJldHVybiBcIlRlYUZvcm8jXCIgKyAoKHRoaXMuaWRlbnRpdHlfZGF0YSA/IHRoaXMuaWRlbnRpdHlfZGF0YS5uYW1lKCkgOiBcIkFub3RoZXIgVGVhU3BlYWsgdXNlclwiKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmxldCBzdGF0aWNfaWRlbnRpdHk6IFRlYUZvcnVtSWRlbnRpdHk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0X3N0YXRpY19pZGVudGl0eShpZGVudGl0eTogVGVhRm9ydW1JZGVudGl0eSkge1xyXG4gICAgc3RhdGljX2lkZW50aXR5ID0gaWRlbnRpdHk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVfZm9ydW0oKSB7XHJcbiAgICBpZihmb3J1bS5sb2dnZWRfaW4oKSAmJiAoIXN0YXRpY19pZGVudGl0eSB8fCBzdGF0aWNfaWRlbnRpdHkuZGF0YSgpICE9PSBmb3J1bS5kYXRhKCkpKSB7XHJcbiAgICAgICAgc3RhdGljX2lkZW50aXR5ID0gbmV3IFRlYUZvcnVtSWRlbnRpdHkoZm9ydW0uZGF0YSgpKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc3RhdGljX2lkZW50aXR5ID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRfc3RhdGljX2ZvcnVtX2lkZW50aXR5KCkgOiBib29sZWFuIHtcclxuICAgIHJldHVybiBzdGF0aWNfaWRlbnRpdHkgJiYgc3RhdGljX2lkZW50aXR5LnZhbGlkKCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdGF0aWNfZm9ydW1faWRlbnRpdHkoKSA6IFRlYUZvcnVtSWRlbnRpdHkgfCB1bmRlZmluZWQge1xyXG4gICAgcmV0dXJuIHN0YXRpY19pZGVudGl0eTtcclxufSIsImltcG9ydCB7YXJyYXlCdWZmZXJCYXNlNjQsIGJhc2U2NF9lbmNvZGVfYWIsIHN0cjJhYjh9IGZyb20gXCIuLi8uLi9tYWluXCI7XHJcbmltcG9ydCB7c2hhfSBmcm9tIFwiLi4vLi4vY3J5cHRvL3NoYVwiO1xyXG5pbXBvcnQge2FzbjF9IGZyb20gXCIuLi8uLi9jcnlwdG8vYXNuMVwiO1xyXG5pbXBvcnQge0Fic3RyYWN0U2VydmVyQ29ubmVjdGlvbn0gZnJvbSBcIi4uLy4uL2Nvbm5lY3Rpb24vQ29ubmVjdGlvbkJhc2VcIjtcclxuaW1wb3J0IHtsb2csIExvZ0NhdGVnb3J5fSBmcm9tIFwiLi4vLi4vbG9nXCI7XHJcbmltcG9ydCB7Q29tbWFuZFJlc3VsdH0gZnJvbSBcIi4uLy4uL2Nvbm5lY3Rpb24vU2VydmVyQ29ubmVjdGlvbkRlY2xhcmF0aW9uXCI7XHJcbmltcG9ydCB7c2V0dGluZ3N9IGZyb20gXCIuLi8uLi9zZXR0aW5nc1wiO1xyXG5pbXBvcnQge2Nvbm5lY3Rpb259IGZyb20gXCIuLi8uLi9jb25uZWN0aW9uL0hhbmRzaGFrZUhhbmRsZXJcIjtcclxuaW1wb3J0IEhhbmRzaGFrZUlkZW50aXR5SGFuZGxlciA9IGNvbm5lY3Rpb24uSGFuZHNoYWtlSWRlbnRpdHlIYW5kbGVyO1xyXG5pbXBvcnQge0Fic3RyYWN0SGFuZHNoYWtlSWRlbnRpdHlIYW5kbGVyLCBIYW5kc2hha2VDb21tYW5kSGFuZGxlciwgSWRlbnRpdGlmeVR5cGUsIElkZW50aXR5fSBmcm9tIFwiLi4vSWRlbnRpdHlcIjtcclxuXHJcbmV4cG9ydCBuYW1lc3BhY2UgQ3J5cHRvSGVscGVyIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBiYXNlNjRfdXJsX2VuY29kZShzdHIpe1xyXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFwrL2csICctJykucmVwbGFjZSgvXFwvL2csICdfJykucmVwbGFjZSgvXFw9KyQvLCAnJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NF91cmxfZGVjb2RlKHN0cjogc3RyaW5nLCBwYWQ/OiBib29sZWFuKXtcclxuICAgICAgICBpZih0eXBlb2YocGFkKSA9PT0gJ3VuZGVmaW5lZCcgfHwgcGFkKVxyXG4gICAgICAgICAgICBzdHIgPSAoc3RyICsgJz09PScpLnNsaWNlKDAsIHN0ci5sZW5ndGggKyAoc3RyLmxlbmd0aCAlIDQpKTtcclxuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoLy0vZywgJysnKS5yZXBsYWNlKC9fL2csICcvJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFycmF5YnVmZmVyX3RvX3N0cmluZyhidWYpIHtcclxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBuZXcgVWludDE2QXJyYXkoYnVmKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4cG9ydF9lY2Nfa2V5KGNyeXB0b19rZXk6IENyeXB0b0tleSwgcHVibGljX2tleTogYm9vbGVhbikge1xyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICAgIFRvbWNyeXB0IHB1YmxpYyBrZXkgZXhwb3J0OlxyXG4gICAgICAgICAgICBpZiAodHlwZSA9PSBQS19QUklWQVRFKSB7XHJcbiAgICAgICAgICAgICAgIGZsYWdzWzBdID0gMTtcclxuICAgICAgICAgICAgICAgZXJyID0gZGVyX2VuY29kZV9zZXF1ZW5jZV9tdWx0aShvdXQsIG91dGxlbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMVENfQVNOMV9CSVRfU1RSSU5HLCAgICAgIDFVTCwgZmxhZ3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTFRDX0FTTjFfU0hPUlRfSU5URUdFUiwgICAxVUwsICZrZXlfc2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMVENfQVNOMV9JTlRFR0VSLCAgICAgICAgIDFVTCwga2V5LT5wdWJrZXkueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMVENfQVNOMV9JTlRFR0VSLCAgICAgICAgIDFVTCwga2V5LT5wdWJrZXkueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMVENfQVNOMV9JTlRFR0VSLCAgICAgICAgIDFVTCwga2V5LT5rLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExUQ19BU04xX0VPTCwgICAgICAgICAgICAgMFVMLCBOVUxMKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgZmxhZ3NbMF0gPSAwO1xyXG4gICAgICAgICAgICAgICBlcnIgPSBkZXJfZW5jb2RlX3NlcXVlbmNlX211bHRpKG91dCwgb3V0bGVuLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExUQ19BU04xX0JJVF9TVFJJTkcsICAgICAgMVVMLCBmbGFncyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMVENfQVNOMV9TSE9SVF9JTlRFR0VSLCAgIDFVTCwgJmtleV9zaXplLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExUQ19BU04xX0lOVEVHRVIsICAgICAgICAgMVVMLCBrZXktPnB1YmtleS54LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExUQ19BU04xX0lOVEVHRVIsICAgICAgICAgMVVMLCBrZXktPnB1YmtleS55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExUQ19BU04xX0VPTCwgICAgICAgICAgICAgMFVMLCBOVUxMKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgKi9cclxuXHJcbiAgICAgICAgY29uc3Qga2V5X2RhdGEgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmV4cG9ydEtleShcImp3a1wiLCBjcnlwdG9fa2V5KTtcclxuXHJcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcclxuICAgICAgICBjb25zdCBsZW5ndGggPSBwdWJsaWNfa2V5ID8gNzkgOiAxMTQ7IC8qIG1heCBsZW5ndGhzISBEZXBlbmRzIG9uIHRoZSBwYWRkaW5nIGNvdWxkIGJlIGxlc3MgKi9cclxuICAgICAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShsZW5ndGgpOyAvKiBmaXhlZCBBU04xIGxlbmd0aCAqL1xyXG4gICAgICAgIHsgLyogdGhlIGluaXRpYWwgc2VxdWVuY2UgKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgzMDsgLyogdHlwZSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDAwOyAvKiB3ZSB3aWxsIHNldCB0aGUgc2VxdWVuY2UgbGVuZ3RoIGxhdGVyICovXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHsgLyogdGhlIGZsYWdzIGJpdCBzdHJpbmcgKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgwMzsgLyogdHlwZSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDAyOyAvKiBsZW5ndGggKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgwNzsgLyogZGF0YSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSBwdWJsaWNfa2V5ID8gMHgwMCA6IDB4ODA7IC8qIGZsYWcgMSBvciAwICgxID0gcHJpdmF0ZSBrZXkpKi9cclxuICAgICAgICB9XHJcbiAgICAgICAgeyAvKiBrZXkgc2l6ZSAoY29uc3QgMzIgZm9yIFAtMjU2KSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDAyOyAvKiB0eXBlICovXHJcbiAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDB4MDE7IC8qIGxlbmd0aCAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDIwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnkgeyAvKiBQdWJsaWMga2V4IFggKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgwMjsgLyogdHlwZSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDIwOyAvKiBsZW5ndGggKi9cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJhdyA9IGF0b2IoYmFzZTY0X3VybF9kZWNvZGUoa2V5X2RhdGEueCwgZmFsc2UpKTtcclxuICAgICAgICAgICAgaWYocmF3LmNoYXJDb2RlQXQoMCkgPiAweDdGKSB7XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbaW5kZXggLSAxXSArPSAxO1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IDMyOyBpKyspXHJcbiAgICAgICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSByYXcuY2hhckNvZGVBdChpKTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gcGFyc2UgeCBjb29yZGluYXRlIChpbnZhbGlkIGJhc2U2NClcIjtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnkgeyAvKiBQdWJsaWMga2V4IFkgKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgwMjsgLyogdHlwZSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDIwOyAvKiBsZW5ndGggKi9cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJhdyA9IGF0b2IoYmFzZTY0X3VybF9kZWNvZGUoa2V5X2RhdGEueSwgZmFsc2UpKTtcclxuICAgICAgICAgICAgaWYocmF3LmNoYXJDb2RlQXQoMCkgPiAweDdGKSB7XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbaW5kZXggLSAxXSArPSAxO1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IDMyOyBpKyspXHJcbiAgICAgICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSByYXcuY2hhckNvZGVBdChpKTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gcGFyc2UgeSBjb29yZGluYXRlIChpbnZhbGlkIGJhc2U2NClcIjtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZighcHVibGljX2tleSkge1xyXG4gICAgICAgICAgICB0cnkgeyAvKiBQdWJsaWMga2V4IEsgKi9cclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDB4MDI7IC8qIHR5cGUgKi9cclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDB4MjA7IC8qIGxlbmd0aCAqL1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJhdyA9IGF0b2IoYmFzZTY0X3VybF9kZWNvZGUoa2V5X2RhdGEuZCwgZmFsc2UpKTtcclxuICAgICAgICAgICAgICAgIGlmKHJhdy5jaGFyQ29kZUF0KDApID4gMHg3Rikge1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleCAtIDFdICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMzI7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSByYXcuY2hhckNvZGVBdChpKTtcclxuICAgICAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgaWYoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gcGFyc2UgeSBjb29yZGluYXRlIChpbnZhbGlkIGJhc2U2NClcIjtcclxuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBidWZmZXJbMV0gPSBpbmRleCAtIDI7IC8qIHNldCB0aGUgZmluYWwgc2VxdWVuY2UgbGVuZ3RoICovXHJcblxyXG4gICAgICAgIHJldHVybiBiYXNlNjRfZW5jb2RlX2FiKGJ1ZmZlci5idWZmZXIuc2xpY2UoMCwgaW5kZXgpKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjcnlwdF9rZXkgPSBcImI5ZGZhYTdiZWU2YWM1N2FjN2I2NWYxMDk0YTFjMTU1ZTc0NzMyN2JjMmZlNWQ1MWM1MTIwMjNmZTU0YTI4MDIwMTAwNGU5MGFkMWRhYWFlMTA3NWQ1M2I3ZDU3MWMzMGUwNjNiNWE2MmE0YTAxN2JiMzk0ODMzYWEwOTgzZTZlXCI7XHJcbiAgICBmdW5jdGlvbiBjX3N0cmxlbihidWZmZXI6IFVpbnQ4QXJyYXksIG9mZnNldDogbnVtYmVyKSA6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcclxuICAgICAgICB3aGlsZShpbmRleCArIG9mZnNldCA8IGJ1ZmZlci5sZW5ndGggJiYgYnVmZmVyW2luZGV4ICsgb2Zmc2V0XSAhPSAwKVxyXG4gICAgICAgICAgICBpbmRleCsrO1xyXG4gICAgICAgIHJldHVybiBpbmRleDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVjcnlwdF90c19pZGVudGl0eShidWZmZXI6IFVpbnQ4QXJyYXkpIDogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgICAgICAvKiBidWZmZXIgY291bGQgY29udGFpbnMgYSB6ZXJvISAqL1xyXG4gICAgICAgIGNvbnN0IGhhc2ggPSBuZXcgVWludDhBcnJheShhd2FpdCBzaGEuc2hhMShidWZmZXIuYnVmZmVyLnNsaWNlKDIwLCAyMCArIGNfc3RybGVuKGJ1ZmZlciwgMjApKSkpO1xyXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCAyMDsgaSsrKVxyXG4gICAgICAgICAgICBidWZmZXJbaV0gXj0gaGFzaFtpXTtcclxuXHJcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gTWF0aC5taW4oYnVmZmVyLmxlbmd0aCwgMTAwKTtcclxuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgIGJ1ZmZlcltpXSBePSBjcnlwdF9rZXkuY2hhckNvZGVBdChpKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGFycmF5YnVmZmVyX3RvX3N0cmluZyhidWZmZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbmNyeXB0X3RzX2lkZW50aXR5KGJ1ZmZlcjogVWludDhBcnJheSkgOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IE1hdGgubWluKGJ1ZmZlci5sZW5ndGgsIDEwMCk7XHJcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICBidWZmZXJbaV0gXj0gY3J5cHRfa2V5LmNoYXJDb2RlQXQoaSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGhhc2ggPSBuZXcgVWludDhBcnJheShhd2FpdCBzaGEuc2hhMShidWZmZXIuYnVmZmVyLnNsaWNlKDIwLCAyMCArIGNfc3RybGVuKGJ1ZmZlciwgMjApKSkpO1xyXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCAyMDsgaSsrKVxyXG4gICAgICAgICAgICBidWZmZXJbaV0gXj0gaGFzaFtpXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGJhc2U2NF9lbmNvZGVfYWIoYnVmZmVyKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSBidWZmZXIgYmFzZTY0IGVuY29kZWQgQVNOLjEgc3RyaW5nXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBkZWNvZGVfdG9tY3J5cHRfa2V5KGJ1ZmZlcjogc3RyaW5nKSB7XHJcbiAgICAgICAgbGV0IGRlY29kZWQ7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGRlY29kZWQgPSBhc24xLmRlY29kZShhdG9iKGJ1ZmZlcikpO1xyXG4gICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgaWYoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24pXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBcImZhaWxlZCB0byBwYXJzZSBrZXkgYnVmZmVyIChpbnZhbGlkIGJhc2U2NClcIjtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQge3gsIHksIGt9ID0ge1xyXG4gICAgICAgICAgICB4OiBkZWNvZGVkLmNoaWxkcmVuWzJdLmNvbnRlbnQoSW5maW5pdHksIGFzbjEuVGFnVHlwZS5WaXNpYmxlU3RyaW5nKSxcclxuICAgICAgICAgICAgeTogZGVjb2RlZC5jaGlsZHJlblszXS5jb250ZW50KEluZmluaXR5LCBhc24xLlRhZ1R5cGUuVmlzaWJsZVN0cmluZyksXHJcbiAgICAgICAgICAgIGs6IGRlY29kZWQuY2hpbGRyZW5bNF0uY29udGVudChJbmZpbml0eSwgYXNuMS5UYWdUeXBlLlZpc2libGVTdHJpbmcpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYoeC5sZW5ndGggPiAzMikge1xyXG4gICAgICAgICAgICBpZih4LmNoYXJDb2RlQXQoMCkgIT0gMClcclxuICAgICAgICAgICAgICAgIHRocm93IFwiSW52YWxpZCBYIGNvb3JkaW5hdGUhIChUb28gbG9uZylcIjtcclxuICAgICAgICAgICAgeCA9IHguc3Vic3RyKDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoeS5sZW5ndGggPiAzMikge1xyXG4gICAgICAgICAgICBpZih5LmNoYXJDb2RlQXQoMCkgIT0gMClcclxuICAgICAgICAgICAgICAgIHRocm93IFwiSW52YWxpZCBZIGNvb3JkaW5hdGUhIChUb28gbG9uZylcIjtcclxuICAgICAgICAgICAgeSA9IHkuc3Vic3RyKDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoay5sZW5ndGggPiAzMikge1xyXG4gICAgICAgICAgICBpZihrLmNoYXJDb2RlQXQoMCkgIT0gMClcclxuICAgICAgICAgICAgICAgIHRocm93IFwiSW52YWxpZCBwcml2YXRlIGNvb3JkaW5hdGUhIChUb28gbG9uZylcIjtcclxuICAgICAgICAgICAgayA9IGsuc3Vic3RyKDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICBjb25zb2xlLmxvZyhcIktleSB4OiAlcyAoJWQpXCIsIGJ0b2EoeCksIHgubGVuZ3RoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIktleSB5OiAlcyAoJWQpXCIsIGJ0b2EoeSksIHkubGVuZ3RoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIktleSBrOiAlcyAoJWQpXCIsIGJ0b2EoayksIGsubGVuZ3RoKTtcclxuICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNydjogXCJQLTI1NlwiLFxyXG4gICAgICAgICAgICBkOiBiYXNlNjRfdXJsX2VuY29kZShidG9hKGspKSxcclxuICAgICAgICAgICAgeDogYmFzZTY0X3VybF9lbmNvZGUoYnRvYSh4KSksXHJcbiAgICAgICAgICAgIHk6IGJhc2U2NF91cmxfZW5jb2RlKGJ0b2EoeSkpLFxyXG5cclxuICAgICAgICAgICAgZXh0OiB0cnVlLFxyXG4gICAgICAgICAgICBrZXlfb3BzOltcImRlcml2ZUtleVwiLCBcInNpZ25cIl0sXHJcbiAgICAgICAgICAgIGt0eTpcIkVDXCIsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgVGVhU3BlYWtIYW5kc2hha2VIYW5kbGVyIGV4dGVuZHMgQWJzdHJhY3RIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIge1xyXG4gICAgaWRlbnRpdHk6IFRlYVNwZWFrSWRlbnRpdHk7XHJcbiAgICBoYW5kbGVyOiBIYW5kc2hha2VDb21tYW5kSGFuZGxlcjxUZWFTcGVha0hhbmRzaGFrZUhhbmRsZXI+O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IEFic3RyYWN0U2VydmVyQ29ubmVjdGlvbiwgaWRlbnRpdHk6IFRlYVNwZWFrSWRlbnRpdHkpIHtcclxuICAgICAgICBzdXBlcihjb25uZWN0aW9uKTtcclxuICAgICAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHk7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVyID0gbmV3IEhhbmRzaGFrZUNvbW1hbmRIYW5kbGVyKGNvbm5lY3Rpb24sIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlcltcImhhbmRzaGFrZWlkZW50aXR5cHJvb2ZcIl0gPSB0aGlzLmhhbmRsZV9wcm9vZi5iaW5kKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0X2hhbmRzaGFrZSgpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS5yZWdpc3Rlcl9oYW5kbGVyKHRoaXMuaGFuZGxlcik7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRfY29tbWFuZChcImhhbmRzaGFrZWJlZ2luXCIsIHtcclxuICAgICAgICAgICAgaW50ZW50aW9uOiAwLFxyXG4gICAgICAgICAgICBhdXRoZW50aWNhdGlvbl9tZXRob2Q6IHRoaXMuaWRlbnRpdHkudHlwZSgpLFxyXG4gICAgICAgICAgICBwdWJsaWNLZXk6IHRoaXMuaWRlbnRpdHkucHVibGljX2tleVxyXG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5LklERU5USVRJRVMsIHRyKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgVGVhbVNwZWFrIGJhc2VkIGhhbmRzaGFrZS4gRXJyb3I6ICVvXCIpLCBlcnJvcik7XHJcblxyXG4gICAgICAgICAgICBpZihlcnJvciBpbnN0YW5jZW9mIENvbW1hbmRSZXN1bHQpXHJcbiAgICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLmV4dHJhX21lc3NhZ2UgfHwgZXJyb3IubWVzc2FnZTtcclxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyX2ZhaWwoXCJmYWlsZWQgdG8gZXhlY3V0ZSBiZWdpbiAoXCIgKyBlcnJvciArIFwiKVwiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZV9wcm9vZihqc29uKSB7XHJcbiAgICAgICAgaWYoIWpzb25bMF1bXCJkaWdlc3RcIl0pIHtcclxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyX2ZhaWwoXCJzZXJ2ZXIgdG9vIG9sZFwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pZGVudGl0eS5zaWduX21lc3NhZ2UoanNvblswXVtcIm1lc3NhZ2VcIl0sIGpzb25bMF1bXCJkaWdlc3RcIl0pLnRoZW4ocHJvb2YgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZF9jb21tYW5kKFwiaGFuZHNoYWtlaW5kZW50aXR5cHJvb2ZcIiwge3Byb29mOiBwcm9vZn0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5JREVOVElUSUVTLCB0cihcIkZhaWxlZCB0byBwcm9vZiB0aGUgaWRlbnRpdHkuIEVycm9yOiAlb1wiKSwgZXJyb3IpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGVycm9yIGluc3RhbmNlb2YgQ29tbWFuZFJlc3VsdClcclxuICAgICAgICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLmV4dHJhX21lc3NhZ2UgfHwgZXJyb3IubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcl9mYWlsKFwiZmFpbGVkIHRvIGV4ZWN1dGUgcHJvb2YgKFwiICsgZXJyb3IgKyBcIilcIik7XHJcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4gdGhpcy50cmlnZ2VyX3N1Y2Nlc3MoKSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJfZmFpbChcImZhaWxlZCB0byBzaWduIG1lc3NhZ2VcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHRyaWdnZXJfZmFpbChtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcy5oYW5kbGVyKTtcclxuICAgICAgICBzdXBlci50cmlnZ2VyX2ZhaWwobWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHRyaWdnZXJfc3VjY2VzcygpIHtcclxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29tbWFuZF9oYW5kbGVyX2Jvc3MoKS51bnJlZ2lzdGVyX2hhbmRsZXIodGhpcy5oYW5kbGVyKTtcclxuICAgICAgICBzdXBlci50cmlnZ2VyX3N1Y2Nlc3MoKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgSWRlbnRpdHlQT1dXb3JrZXIge1xyXG4gICAgcHJpdmF0ZSBfd29ya2VyOiBXb3JrZXI7XHJcbiAgICBwcml2YXRlIF9jdXJyZW50X2hhc2g6IHN0cmluZztcclxuICAgIHByaXZhdGUgX2Jlc3RfbGV2ZWw6IG51bWJlcjtcclxuXHJcbiAgICBhc3luYyBpbml0aWFsaXplKGtleTogc3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5fd29ya2VyID0gbmV3IFdvcmtlcihzZXR0aW5ncy5zdGF0aWMoXCJ3b3JrZXJfZGlyZWN0b3J5XCIsIFwianMvd29ya2Vycy9cIikgKyBcIldvcmtlclBPVy5qc1wiKTtcclxuXHJcbiAgICAgICAgLyogaW5pdGlhbGl6ZSAqL1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdGltZW91dF9pZCA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KFwidGltZW91dFwiKSwgMTAwMCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRfaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKCFldmVudC5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiaW52YWxpZCBkYXRhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZighZXZlbnQuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiaW5pdGlhbGl6ZSBmYWlsZWQgKFwiICsgZXZlbnQuZGF0YS5zdWNjZXNzICsgXCIgfCBcIiArIChldmVudC5kYXRhLm1lc3NhZ2UgfHwgXCJ1bmtub3duIGVyb3JvclwiKSArIFwiKVwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IGV2ZW50ID0+IHRoaXMuaGFuZGxlX21lc3NhZ2UoZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbmVycm9yID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5LklERU5USVRJRVMsIHRyKFwiUE9XIFdvcmtlciBlcnJvciAlb1wiKSwgZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRfaWQpO1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KFwiRmFpbGVkIHRvIGxvYWQgd29ya2VyIChcIiArIGV2ZW50Lm1lc3NhZ2UgKyBcIilcIik7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8qIHNldCBkYXRhICovXHJcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLl93b3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJzZXRfZGF0YVwiLFxyXG4gICAgICAgICAgICAgICAgcHJpdmF0ZV9rZXk6IGtleSxcclxuICAgICAgICAgICAgICAgIGNvZGU6IFwic2V0X2RhdGFcIlxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXRfaWQgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChcInRpbWVvdXQgKGRhdGEpXCIpLCAxMDAwKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dF9pZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFldmVudC5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiaW52YWxpZCBkYXRhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWV2ZW50LmRhdGEuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChcImluaXRpYWxpemUgb2YgZGF0YSBmYWlsZWQgKFwiICsgZXZlbnQuZGF0YS5zdWNjZXNzICsgXCIgfCBcIiArIChldmVudC5kYXRhLm1lc3NhZ2UgfHwgXCJ1bmtub3duIGVyb3JvclwiKSArIFwiKVwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IGV2ZW50ID0+IHRoaXMuaGFuZGxlX21lc3NhZ2UoZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgbWluZShoYXNoOiBzdHJpbmcsIGl0ZXJhdGlvbnM6IG51bWJlciwgdGFyZ2V0OiBudW1iZXIsIHRpbWVvdXQ/OiBudW1iZXIpIDogUHJvbWlzZTxCb29sZWFuPiB7XHJcbiAgICAgICAgdGhpcy5fY3VycmVudF9oYXNoID0gaGFzaDtcclxuICAgICAgICBpZih0YXJnZXQgPCB0aGlzLl9iZXN0X2xldmVsKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IG5ldyBQcm9taXNlPEJvb2xlYW4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwibWluZVwiLFxyXG4gICAgICAgICAgICAgICAgaGFzaDogdGhpcy5fY3VycmVudF9oYXNoLFxyXG4gICAgICAgICAgICAgICAgaXRlcmF0aW9uczogaXRlcmF0aW9ucyxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgY29kZTogXCJtaW5lXCJcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0X2lkID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoXCJ0aW1lb3V0IChtaW5lKVwiKSwgdGltZW91dCB8fCA1MDAwKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX3dvcmtlci5vbm1lc3NhZ2UgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gZXZlbnQgPT4gdGhpcy5oYW5kbGVfbWVzc2FnZShldmVudC5kYXRhKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dF9pZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWV2ZW50LmRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoXCJpbnZhbGlkIGRhdGFcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghZXZlbnQuZGF0YS5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwibWluaW5nIGZhaWxlZCAoXCIgKyBldmVudC5kYXRhLnN1Y2Nlc3MgKyBcIiB8IFwiICsgKGV2ZW50LmRhdGEubWVzc2FnZSB8fCBcInVua25vd24gZXJvcm9yXCIpICsgXCIpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihldmVudC5kYXRhLnJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2Jlc3RfbGV2ZWwgPSBldmVudC5kYXRhLmxldmVsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRfaGFzaCA9IGV2ZW50LmRhdGEuaGFzaDtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTsgLyogbm8gcmVzdWx0ICovXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3VycmVudF9oYXNoKCkgOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50X2hhc2g7XHJcbiAgICB9XHJcblxyXG4gICAgY3VycmVudF9sZXZlbCgpIDogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fYmVzdF9sZXZlbDtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmaW5hbGl6ZSh0aW1lb3V0PzogbnVtYmVyKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLnBvc3RNZXNzYWdlKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImZpbmFsaXplXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY29kZTogXCJmaW5hbGl6ZVwiXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lb3V0X2lkID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoXCJ0aW1lb3V0XCIpLCB0aW1lb3V0IHx8IDI1MCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5fd29ya2VyLm9ubWVzc2FnZSA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl93b3JrZXIub25tZXNzYWdlID0gZXZlbnQgPT4gdGhpcy5oYW5kbGVfbWVzc2FnZShldmVudC5kYXRhKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRfaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV2ZW50LmRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiaW52YWxpZCBkYXRhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV2ZW50LmRhdGEuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoXCJmYWlsZWQgdG8gZmluYWxpemUgKFwiICsgZXZlbnQuZGF0YS5zdWNjZXNzICsgXCIgfCBcIiArIChldmVudC5kYXRhLm1lc3NhZ2UgfHwgXCJ1bmtub3duIGVyb3JvclwiKSArIFwiKVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgdHIoXCJGYWlsZWQgdG8gZmluYWxpemUgUE9XIHdvcmtlciEgKCVvKVwiKSwgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fd29ya2VyLnRlcm1pbmF0ZSgpO1xyXG4gICAgICAgIHRoaXMuX3dvcmtlciA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZV9tZXNzYWdlKG1lc3NhZ2U6IGFueSkge1xyXG4gICAgICAgIGxvZy5pbmZvKExvZ0NhdGVnb3J5LklERU5USVRJRVMsIHRyKFwiUmVjZWl2ZWQgbWVzc2FnZTogJW9cIiksIG1lc3NhZ2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGVhU3BlYWtJZGVudGl0eSBpbXBsZW1lbnRzIElkZW50aXR5IHtcclxuICAgIHN0YXRpYyBhc3luYyBnZW5lcmF0ZV9uZXcoKSA6IFByb21pc2U8VGVhU3BlYWtJZGVudGl0eT4ge1xyXG4gICAgICAgIGxldCBrZXk6IENyeXB0b0tleVBhaXI7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAga2V5ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5nZW5lcmF0ZUtleSh7bmFtZTonRUNESCcsIG5hbWVkQ3VydmU6ICdQLTI1Nid9LCB0cnVlLCBbXCJkZXJpdmVLZXlcIl0pO1xyXG4gICAgICAgIH0gY2F0Y2goZSkge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgdHIoXCJDb3VsZCBub3QgZ2VuZXJhdGUgYSBuZXcga2V5OiAlb1wiKSwgZSk7XHJcbiAgICAgICAgICAgIHRocm93IFwiRmFpbGVkIHRvIGdlbmVyYXRlIGtleXBhaXJcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcHJpdmF0ZV9rZXkgPSBhd2FpdCBDcnlwdG9IZWxwZXIuZXhwb3J0X2VjY19rZXkoa2V5LnByaXZhdGVLZXksIGZhbHNlKTtcclxuXHJcbiAgICAgICAgY29uc3QgaWRlbnRpdHkgPSBuZXcgVGVhU3BlYWtJZGVudGl0eShwcml2YXRlX2tleSwgXCIwXCIsIHVuZGVmaW5lZCwgZmFsc2UpO1xyXG4gICAgICAgIGF3YWl0IGlkZW50aXR5LmluaXRpYWxpemUoKTtcclxuICAgICAgICByZXR1cm4gaWRlbnRpdHk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFzeW5jIGltcG9ydF90cyh0c19zdHJpbmc6IHN0cmluZywgaW5pPzogYm9vbGVhbikgOiBQcm9taXNlPFRlYVNwZWFrSWRlbnRpdHk+IHtcclxuICAgICAgICBjb25zdCBwYXJzZV9zdHJpbmcgPSBzdHJpbmcgPT4ge1xyXG4gICAgICAgICAgICAvKiBwYXJzaW5nIHdpdGhvdXQgSU5JIHN0cnVjdHVyZSAqL1xyXG4gICAgICAgICAgICBjb25zdCBWX2luZGV4ID0gc3RyaW5nLmluZGV4T2YoJ1YnKTtcclxuICAgICAgICAgICAgaWYoVl9pbmRleCA9PSAtMSkgdGhyb3cgXCJpbnZhbGlkIGlucHV0IChtaXNzaW5nIFYpXCI7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgaGFzaDogc3RyaW5nLnN1YnN0cigwLCBWX2luZGV4KSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHN0cmluZy5zdWJzdHIoVl9pbmRleCArIDEpLFxyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJUZWFTcGVhayB1c2VyXCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHtoYXNoLCBkYXRhLCBuYW1lfSA9ICghaW5pID8gKCkgPT4gcGFyc2Vfc3RyaW5nKHRzX3N0cmluZykgOiAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8qIHBhcnNpbmcgd2l0aCBJTkkgc3RydWN0dXJlICovXHJcbiAgICAgICAgICAgIGxldCBpZGVudGl0eTogc3RyaW5nLCBuYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgICAgICAgICBmb3IoY29uc3QgbGluZSBvZiB0c19zdHJpbmcuc3BsaXQoXCJcXG5cIikpIHtcclxuICAgICAgICAgICAgICAgIGlmKGxpbmUuc3RhcnRzV2l0aChcImlkZW50aXR5PVwiKSlcclxuICAgICAgICAgICAgICAgICAgICBpZGVudGl0eSA9IGxpbmUuc3Vic3RyKDkpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZihsaW5lLnN0YXJ0c1dpdGgoXCJuaWNrbmFtZT1cIikpXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IGxpbmUuc3Vic3RyKDkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZighaWRlbnRpdHkpIHRocm93IFwibWlzc2luZyBpZGVudGl0eSBrZXl3b3JkXCI7XHJcbiAgICAgICAgICAgIGlkZW50aXR5ID0gaWRlbnRpdHkubWF0Y2goL15cIj8oWzAtOV0rVlswLTlhLXpBLVorXFwvXStbPV0rKVwiPyQvKVsxXTtcclxuICAgICAgICAgICAgaWYoIWlkZW50aXR5KSB0aHJvdyBcImludmFsaWQgaWRlbnRpdHkga2V5IHZhbHVlXCI7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBwYXJzZV9zdHJpbmcoaWRlbnRpdHkpO1xyXG4gICAgICAgICAgICByZXN1bHQubmFtZSA9IG5hbWUgfHwgcmVzdWx0Lm5hbWU7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSkoKTtcclxuXHJcbiAgICAgICAgaWYoIXRzX3N0cmluZy5tYXRjaCgvWzAtOV0rL2cpKSB0aHJvdyBcImludmFsaWQgaGFzaCFcIjtcclxuXHJcbiAgICAgICAgbGV0IGJ1ZmZlcjtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlckJhc2U2NChkYXRhKSk7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgdHIoXCJGYWlsZWQgdG8gZGVjb2RlIGdpdmVuIGJhc2U2NCBkYXRhICglcylcIiksIGRhdGEpO1xyXG4gICAgICAgICAgICB0aHJvdyBcImZhaWxlZCB0byBiYXNlIGRhdGEgKGJhc2U2NCBkZWNvZGUgZmFpbGVkKVwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBrZXk2NCA9IGF3YWl0IENyeXB0b0hlbHBlci5kZWNyeXB0X3RzX2lkZW50aXR5KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyQmFzZTY0KGRhdGEpKSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gbmV3IFRlYVNwZWFrSWRlbnRpdHkoa2V5NjQsIGhhc2gsIG5hbWUsIGZhbHNlKTtcclxuICAgICAgICBhd2FpdCBpZGVudGl0eS5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgcmV0dXJuIGlkZW50aXR5O1xyXG4gICAgfVxyXG5cclxuICAgIGhhc2hfbnVtYmVyOiBzdHJpbmc7IC8qIGhhc2ggc3VmZml4IGZvciB0aGUgcHJpdmF0ZSBrZXkgKi9cclxuICAgIHByaXZhdGVfa2V5OiBzdHJpbmc7IC8qIGJhc2U2NCByZXByZXNlbnRhdGlvbiBvZiB0aGUgcHJpdmF0ZSBrZXkgKi9cclxuICAgIF9uYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgcHVibGljX2tleTogc3RyaW5nOyAvKiBvbmx5IHNldCB3aGVuIGluaXRpYWxpemVkICovXHJcblxyXG4gICAgcHJpdmF0ZSBfaW5pdGlhbGl6ZWQ6IGJvb2xlYW47XHJcbiAgICBwcml2YXRlIF9jcnlwdG9fa2V5OiBDcnlwdG9LZXk7XHJcbiAgICBwcml2YXRlIF9jcnlwdG9fa2V5X3NpZ246IENyeXB0b0tleTtcclxuXHJcbiAgICBwcml2YXRlIF91bmlxdWVfaWQ6IHN0cmluZztcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlX2tleT86IHN0cmluZywgaGFzaD86IHN0cmluZywgbmFtZT86IHN0cmluZywgaW5pdGlhbGl6ZT86IGJvb2xlYW4pIHtcclxuICAgICAgICB0aGlzLnByaXZhdGVfa2V5ID0gcHJpdmF0ZV9rZXk7XHJcbiAgICAgICAgdGhpcy5oYXNoX251bWJlciA9IGhhc2ggfHwgXCIwXCI7XHJcbiAgICAgICAgdGhpcy5fbmFtZSA9IG5hbWU7XHJcblxyXG4gICAgICAgIGlmKHRoaXMucHJpdmF0ZV9rZXkgJiYgKHR5cGVvZihpbml0aWFsaXplKSA9PT0gXCJ1bmRlZmluZWRcIiB8fCBpbml0aWFsaXplKSkge1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemUoKS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBUZWFTcGVha0lkZW50aXR5ICglcylcIiwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZhbGxiYWNrX25hbWUoKTogc3RyaW5nIHwgdW5kZWZpbmVkICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX25hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgdWlkKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3VuaXF1ZV9pZDtcclxuICAgIH1cclxuXHJcbiAgICB0eXBlKCk6IElkZW50aXRpZnlUeXBlIHtcclxuICAgICAgICByZXR1cm4gSWRlbnRpdGlmeVR5cGUuVEVBTVNQRUFLO1xyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbml0aWFsaXplZCAmJiAhIXRoaXMuX2NyeXB0b19rZXkgJiYgISF0aGlzLl9jcnlwdG9fa2V5X3NpZ247XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZGVjb2RlKGRhdGE6IHN0cmluZykgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICBpZighanNvbikgdGhyb3cgXCJpbnZhbGlkIGpzb25cIjtcclxuXHJcbiAgICAgICAgaWYoanNvbi52ZXJzaW9uID09IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5wcml2YXRlX2tleSA9IGpzb24ua2V5O1xyXG4gICAgICAgICAgICB0aGlzLmhhc2hfbnVtYmVyID0ganNvbi5oYXNoO1xyXG4gICAgICAgICAgICB0aGlzLl9uYW1lID0ganNvbi5uYW1lO1xyXG4gICAgICAgIH0gZWxzZSBpZihqc29uLnZlcnNpb24gPT0gMSkge1xyXG4gICAgICAgICAgICBjb25zdCBrZXkgPSBqc29uLmtleTtcclxuICAgICAgICAgICAgdGhpcy5fbmFtZSA9IGpzb24ubmFtZTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNsb25lID0gYXdhaXQgVGVhU3BlYWtJZGVudGl0eS5pbXBvcnRfdHMoa2V5LCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHRoaXMucHJpdmF0ZV9rZXkgPSBjbG9uZS5wcml2YXRlX2tleTtcclxuICAgICAgICAgICAgdGhpcy5oYXNoX251bWJlciA9IGNsb25lLmhhc2hfbnVtYmVyO1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICB0aHJvdyBcImludmFsaWQgdmVyc2lvblwiO1xyXG5cclxuICAgICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgIH1cclxuXHJcbiAgICBlbmNvZGU/KCkgOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGtleTogdGhpcy5wcml2YXRlX2tleSxcclxuICAgICAgICAgICAgaGFzaDogdGhpcy5oYXNoX251bWJlcixcclxuICAgICAgICAgICAgbmFtZTogdGhpcy5fbmFtZSxcclxuICAgICAgICAgICAgdmVyc2lvbjogMlxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGxldmVsKCkgOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgICAgIGlmKCF0aGlzLl9pbml0aWFsaXplZCB8fCAhdGhpcy5wdWJsaWNfa2V5KVxyXG4gICAgICAgICAgICB0aHJvdyBcIm5vdCBpbml0aWFsaXplZFwiO1xyXG5cclxuICAgICAgICBjb25zdCBoYXNoID0gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgc2hhLnNoYTEodGhpcy5wdWJsaWNfa2V5ICsgdGhpcy5oYXNoX251bWJlcikpO1xyXG5cclxuICAgICAgICBsZXQgbGV2ZWwgPSAwO1xyXG4gICAgICAgIHdoaWxlKGxldmVsIDwgaGFzaC5ieXRlTGVuZ3RoICYmIGhhc2hbbGV2ZWxdID09IDApXHJcbiAgICAgICAgICAgIGxldmVsKys7XHJcblxyXG4gICAgICAgIGlmKGxldmVsID49IGhhc2guYnl0ZUxlbmd0aCkge1xyXG4gICAgICAgICAgICBsZXZlbCA9IDI1NjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgYnl0ZSA9IGhhc2hbbGV2ZWxdO1xyXG4gICAgICAgICAgICBsZXZlbCA8PD0gMztcclxuICAgICAgICAgICAgd2hpbGUoKGJ5dGUgJiAweDEpID09IDApIHtcclxuICAgICAgICAgICAgICAgIGxldmVsKys7XHJcbiAgICAgICAgICAgICAgICBieXRlID4+PSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbGV2ZWw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYVxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJcclxuICAgICAqIEBkZXNjcmlwdGlvbiBiIG11c3QgYmUgc21hbGxlciAoaW4gYnl0ZXMpIHRoZW4gYVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHN0cmluZ19hZGQoYTogc3RyaW5nLCBiOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBjaGFyX3Jlc3VsdDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBjb25zdCBjaGFyX2EgPSBbLi4uYV0ucmV2ZXJzZSgpLm1hcChlID0+IGUuY2hhckNvZGVBdCgwKSk7XHJcbiAgICAgICAgY29uc3QgY2hhcl9iID0gWy4uLmJdLnJldmVyc2UoKS5tYXAoZSA9PiBlLmNoYXJDb2RlQXQoMCkpO1xyXG5cclxuICAgICAgICBsZXQgY2FycnkgPSBmYWxzZTtcclxuICAgICAgICB3aGlsZShjaGFyX2IubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gY2hhcl9iLnBvcF9mcm9udCgpICsgY2hhcl9hLnBvcF9mcm9udCgpICsgKGNhcnJ5ID8gMSA6IDApIC0gNDg7XHJcbiAgICAgICAgICAgIGlmKChjYXJyeSA9IHJlc3VsdCA+IDU3KSlcclxuICAgICAgICAgICAgICAgIHJlc3VsdCAtPSAxMDtcclxuICAgICAgICAgICAgY2hhcl9yZXN1bHQucHVzaChyZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2hpbGUoY2hhcl9hLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IGNoYXJfYS5wb3BfZnJvbnQoKSArIChjYXJyeSA/IDEgOiAwKTtcclxuICAgICAgICAgICAgaWYoKGNhcnJ5ID0gcmVzdWx0ID4gNTcpKVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0IC09IDEwO1xyXG4gICAgICAgICAgICBjaGFyX3Jlc3VsdC5wdXNoKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihjYXJyeSlcclxuICAgICAgICAgICAgY2hhcl9yZXN1bHQucHVzaCg0OSk7XHJcblxyXG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGNoYXJfcmVzdWx0LnNsaWNlKCkucmV2ZXJzZSgpKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgYXN5bmMgaW1wcm92ZV9sZXZlbF9mb3IodGltZTogbnVtYmVyLCB0aHJlYWRzOiBudW1iZXIpIDogUHJvbWlzZTxCb29sZWFuPiB7XHJcbiAgICAgICAgbGV0IGFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBhY3RpdmUgPSBmYWxzZSwgdGltZSk7XHJcblxyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmltcHJvdmVfbGV2ZWwoLTEsIHRocmVhZHMsICgpID0+IGFjdGl2ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgaW1wcm92ZV9sZXZlbCh0YXJnZXQ6IG51bWJlciwgdGhyZWFkczogbnVtYmVyLCBhY3RpdmVfY2FsbGJhY2s6ICgpID0+IGJvb2xlYW4sIGNhbGxiYWNrX2xldmVsPzogKGN1cnJlbnQ6IG51bWJlcikgPT4gYW55LCBjYWxsYmFja19zdGF0dXM/OiAoaGFzaF9yYXRlOiBudW1iZXIpID0+IGFueSkgOiBQcm9taXNlPEJvb2xlYW4+IHtcclxuICAgICAgICBpZighdGhpcy5faW5pdGlhbGl6ZWQgfHwgIXRoaXMucHVibGljX2tleSlcclxuICAgICAgICAgICAgdGhyb3cgXCJub3QgaW5pdGlhbGl6ZWRcIjtcclxuICAgICAgICBpZih0YXJnZXQgPT0gLTEpIC8qIGdldCB0aGUgaGlnaGVzdCBsZXZlbCBwb3NzaWJsZSAqL1xyXG4gICAgICAgICAgICB0YXJnZXQgPSAwO1xyXG4gICAgICAgIGVsc2UgaWYodGFyZ2V0IDw9IGF3YWl0IHRoaXMubGV2ZWwoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGNvbnN0IHdvcmtlcnM6IElkZW50aXR5UE9XV29ya2VyW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3QgaXRlcmF0aW9ucyA9IDEwMDAwMDtcclxuICAgICAgICBsZXQgY3VycmVudF9oYXNoO1xyXG4gICAgICAgIGNvbnN0IG5leHRfaGFzaCA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYoIWN1cnJlbnRfaGFzaClcclxuICAgICAgICAgICAgICAgIHJldHVybiAoY3VycmVudF9oYXNoID0gdGhpcy5oYXNoX251bWJlcik7XHJcblxyXG4gICAgICAgICAgICBpZihjdXJyZW50X2hhc2gubGVuZ3RoIDwgaXRlcmF0aW9ucy50b1N0cmluZygpLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudF9oYXNoID0gdGhpcy5zdHJpbmdfYWRkKGl0ZXJhdGlvbnMudG9TdHJpbmcoKSwgY3VycmVudF9oYXNoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRfaGFzaCA9IHRoaXMuc3RyaW5nX2FkZChjdXJyZW50X2hhc2gsIGl0ZXJhdGlvbnMudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRfaGFzaDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB7IC8qIGluaXQgKi9cclxuICAgICAgICAgICAgY29uc3QgaW5pdGlhbGl6ZV9wcm9taXNlOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcclxuICAgICAgICAgICAgZm9yKGxldCBpbmRleCA9IDA7IGluZGV4ICA8IHRocmVhZHM7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmtlciA9IG5ldyBJZGVudGl0eVBPV1dvcmtlcigpO1xyXG4gICAgICAgICAgICAgICAgd29ya2Vycy5wdXNoKHdvcmtlcik7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplX3Byb21pc2UucHVzaCh3b3JrZXIuaW5pdGlhbGl6ZSh0aGlzLnB1YmxpY19rZXkpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IFByb21pc2UuYWxsKGluaXRpYWxpemVfcHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5JREVOVElUSUVTLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBcImZhaWxlZCB0byBpbml0aWFsaXplXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCByZXN1bHQgPSBmYWxzZTtcclxuICAgICAgICBsZXQgYmVzdF9sZXZlbCA9IDA7XHJcbiAgICAgICAgbGV0IHRhcmdldF9sZXZlbCA9IHRhcmdldCA+IDAgPyB0YXJnZXQgOiBhd2FpdCB0aGlzLmxldmVsKCkgKyAxO1xyXG5cclxuICAgICAgICBjb25zdCB3b3JrZXJfcHJvbWlzZTogUHJvbWlzZTx2b2lkPltdID0gW107XHJcblxyXG4gICAgICAgIGNvbnN0IGhhc2hfdGltZXN0YW1wczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBsZXQgbGFzdF9oYXNocmF0ZV91cGRhdGU6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGNvbnN0IHVwZGF0ZV9oYXNocmF0ZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYoIWNhbGxiYWNrX3N0YXR1cykgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICBoYXNoX3RpbWVzdGFtcHMucHVzaChub3cpO1xyXG5cclxuICAgICAgICAgICAgaWYobGFzdF9oYXNocmF0ZV91cGRhdGUgKyAxMDAwIDwgbm93KSB7XHJcbiAgICAgICAgICAgICAgICBsYXN0X2hhc2hyYXRlX3VwZGF0ZSA9IG5vdztcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gbm93IC0gMTAgKiAxMDAwOyAvKiAxMHMgKi9cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdW5kcyA9IGhhc2hfdGltZXN0YW1wcy5maWx0ZXIoZSA9PiBlID4gdGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja19zdGF0dXMoTWF0aC5jZWlsKChyb3VuZHMubGVuZ3RoICogaXRlcmF0aW9ucykgLyBNYXRoLmNlaWwoKG5vdyAtIHJvdW5kc1swXSkgLyAxMDAwKSkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWN0aXZlID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBleGl0ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUodHJ1ZSksIDEwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYWxsKHdvcmtlcl9wcm9taXNlKS50aGVuKHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiByZXNvbHZlKHRydWUpKTtcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yKGNvbnN0IHdvcmtlciBvZiB3b3JrZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd29ya2VyX21pbmUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFhY3RpdmUpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3b3JrZXIubWluZShuZXh0X2hhc2goKSwgaXRlcmF0aW9ucywgdGFyZ2V0X2xldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IHByb21pc2UudGhlbihyZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlX2hhc2hyYXRlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2VyX3Byb21pc2UucmVtb3ZlKHApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJlc3VsdC52YWx1ZU9mKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih3b3JrZXIuY3VycmVudF9sZXZlbCgpID4gYmVzdF9sZXZlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc2hfbnVtYmVyID0gd29ya2VyLmN1cnJlbnRfaGFzaCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgXCJGb3VuZCBuZXcgYmVzdCBhdCAlcyAoJWQpLiBPbGQgd2FzICVkXCIsIHRoaXMuaGFzaF9udW1iZXIsIHdvcmtlci5jdXJyZW50X2xldmVsKCksIGJlc3RfbGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZXN0X2xldmVsID0gd29ya2VyLmN1cnJlbnRfbGV2ZWwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tfbGV2ZWwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja19sZXZlbChiZXN0X2xldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0YXJnZXQgPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRfbGV2ZWwgPSBiZXN0X2xldmVsICsgMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYWN0aXZlICYmIChhY3RpdmUgPSBhY3RpdmVfY2FsbGJhY2soKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB3b3JrZXJfbWluZSgpLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcl9wcm9taXNlLnJlbW92ZShwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2cud2FybihMb2dDYXRlZ29yeS5JREVOVElUSUVTLCBcIlBPVyB3b3JrZXIgZXJyb3IgJW9cIiwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgd29ya2VyX3Byb21pc2UucHVzaChwKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB3b3JrZXJfbWluZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vZXJyb3IgYWxyZWFkeSBwcmludGVkIGJlZm9yZSByZWplY3QgaGFkIGJlZW4gY2FsbGVkXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB7IC8qIHNodXRkb3duICovXHJcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsaXplX3Byb21pc2U6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IoY29uc3Qgd29ya2VyIG9mIHdvcmtlcnMpXHJcbiAgICAgICAgICAgICAgICBmaW5hbGl6ZV9wcm9taXNlLnB1c2god29ya2VyLmZpbmFsaXplKDI1MCkpO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IFByb21pc2UuYWxsKGZpbmFsaXplX3Byb21pc2UpO1xyXG4gICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gZmluYWxpemVcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIGlmKCF0aGlzLnByaXZhdGVfa2V5KVxyXG4gICAgICAgICAgICB0aHJvdyBcIkludmFsaWQgcHJpdmF0ZSBrZXlcIjtcclxuXHJcbiAgICAgICAgbGV0IGp3azogYW55O1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGp3ayA9IGF3YWl0IENyeXB0b0hlbHBlci5kZWNvZGVfdG9tY3J5cHRfa2V5KHRoaXMucHJpdmF0ZV9rZXkpO1xyXG4gICAgICAgICAgICBpZighandrKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJyZXN1bHQgdW5kZWZpbmVkXCI7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICB0aHJvdyBcImZhaWxlZCB0byBwYXJzZSBrZXkgKFwiICsgZXJyb3IgKyBcIilcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NyeXB0b19rZXlfc2lnbiA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KFwiandrXCIsIGp3aywge25hbWU6J0VDRFNBJywgbmFtZWRDdXJ2ZTogJ1AtMjU2J30sIGZhbHNlLCBbXCJzaWduXCJdKTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGxvZy5lcnJvcihMb2dDYXRlZ29yeS5JREVOVElUSUVTLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IFwiZmFpbGVkIHRvIGNyZWF0ZSBjcnlwdG8gc2lnbiBrZXlcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NyeXB0b19rZXkgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmltcG9ydEtleShcImp3a1wiLCBqd2ssIHtuYW1lOidFQ0RIJywgbmFtZWRDdXJ2ZTogJ1AtMjU2J30sIHRydWUsIFtcImRlcml2ZUtleVwiXSk7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuSURFTlRJVElFUywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBcImZhaWxlZCB0byBjcmVhdGUgY3J5cHRvIGtleVwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5wdWJsaWNfa2V5ID0gYXdhaXQgQ3J5cHRvSGVscGVyLmV4cG9ydF9lY2Nfa2V5KHRoaXMuX2NyeXB0b19rZXksIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLl91bmlxdWVfaWQgPSBiYXNlNjRfZW5jb2RlX2FiKGF3YWl0IHNoYS5zaGExKHRoaXMucHVibGljX2tleSkpO1xyXG4gICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgbG9nLmVycm9yKExvZ0NhdGVnb3J5LklERU5USVRJRVMsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gY2FsY3VsYXRlIHVuaXF1ZSBpZFwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAgIC8vY29uc3QgcHVibGljX2tleSA9IGF3YWl0IHByb2ZpbGVzLmlkZW50aXRpZXMuQ3J5cHRvSGVscGVyLmV4cG9ydF9lY2Nfa2V5KGtleSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhwb3J0X3RzKGluaT86IGJvb2xlYW4pIDogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgICAgICBpZighdGhpcy5wcml2YXRlX2tleSlcclxuICAgICAgICAgICAgdGhyb3cgXCJJbnZhbGlkIHByaXZhdGUga2V5XCI7XHJcblxyXG4gICAgICAgIGNvbnN0IGlkZW50aXR5ID0gdGhpcy5oYXNoX251bWJlciArIFwiVlwiICsgYXdhaXQgQ3J5cHRvSGVscGVyLmVuY3J5cHRfdHNfaWRlbnRpdHkobmV3IFVpbnQ4QXJyYXkoc3RyMmFiOCh0aGlzLnByaXZhdGVfa2V5KSkpO1xyXG4gICAgICAgIGlmKCFpbmkpIHJldHVybiBpZGVudGl0eTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFwiW0lkZW50aXR5XVxcblwiICtcclxuICAgICAgICAgICAgICAgIFwiaWQ9VGVhV2ViLUV4cG9ydGVkXFxuXCIgK1xyXG4gICAgICAgICAgICAgICAgXCJpZGVudGl0eT1cXFwiXCIgKyBpZGVudGl0eSArIFwiXFxcIlxcblwiICtcclxuICAgICAgICAgICAgICAgIFwibmlja25hbWU9XFxcIlwiICsgdGhpcy5mYWxsYmFja19uYW1lKCkgKyBcIlxcXCJcXG5cIiArXHJcbiAgICAgICAgICAgICAgICBcInBob25ldGljX25pY2tuYW1lPVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHNpZ25fbWVzc2FnZShtZXNzYWdlOiBzdHJpbmcsIGhhc2g6IHN0cmluZyA9IFwiU0hBLTI1NlwiKSA6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICAgICAgLyogYnJpbmcgdGhpcyB0byBsaWJ0b21jcnlwdCBmb3JtYXQgKi9cclxuICAgICAgICBjb25zdCBzaWduX2J1ZmZlciA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuc2lnbih7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiRUNEU0FcIixcclxuICAgICAgICAgICAgaGFzaDogaGFzaFxyXG4gICAgICAgIH0sIHRoaXMuX2NyeXB0b19rZXlfc2lnbiwgc3RyMmFiOChtZXNzYWdlKSk7XHJcbiAgICAgICAgY29uc3Qgc2lnbiA9IG5ldyBVaW50OEFycmF5KHNpZ25fYnVmZmVyKTtcclxuICAgICAgICAvKiBmaXJzdCAzMiByIGJpdHMgfCBsYXN0IDMyIHMgYml0cyAqL1xyXG5cclxuICAgICAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheSg3Mik7XHJcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcclxuXHJcbiAgICAgICAgeyAvKiB0aGUgaW5pdGlhbCBzZXF1ZW5jZSAqL1xyXG4gICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAweDMwOyAvKiB0eXBlICovXHJcbiAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDB4MDA7IC8qIHdlIHdpbGwgc2V0IHRoZSBzZXF1ZW5jZSBsZW5ndGggbGF0ZXIgKi9cclxuICAgICAgICB9XHJcbiAgICAgICAgeyAvKiBpbnRlZ2VyIHIgICovXHJcbiAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDB4MDI7IC8qIHR5cGUgKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgyMDsgLyogbGVuZ3RoICovXHJcblxyXG4gICAgICAgICAgICBpZihzaWduWzBdID4gMHg3Rikge1xyXG4gICAgICAgICAgICAgICAgYnVmZmVyW2luZGV4IC0gMV0gKz0gMTtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCAzMjsgaSsrKVxyXG4gICAgICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gc2lnbltpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgeyAvKiBpbnRlZ2VyIHMgICovXHJcbiAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IDB4MDI7IC8qIHR5cGUgKi9cclxuICAgICAgICAgICAgYnVmZmVyW2luZGV4KytdID0gMHgyMDsgLyogbGVuZ3RoICovXHJcblxyXG4gICAgICAgICAgICBpZihzaWduWzMyXSA+IDB4N0YpIHtcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleCAtIDFdICs9IDE7XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbaW5kZXgrK10gPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMzI7IGkrKylcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltpbmRleCsrXSA9IHNpZ25bMzIgKyBpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnVmZmVyWzFdID0gaW5kZXggLSAyO1xyXG5cclxuICAgICAgICByZXR1cm4gYmFzZTY0X2VuY29kZV9hYihidWZmZXIuc3ViYXJyYXkoMCwgaW5kZXgpKTtcclxuICAgIH1cclxuXHJcbiAgICBzcGF3bl9pZGVudGl0eV9oYW5kc2hha2VfaGFuZGxlcihjb25uZWN0aW9uOiBBYnN0cmFjdFNlcnZlckNvbm5lY3Rpb24pOiBIYW5kc2hha2VJZGVudGl0eUhhbmRsZXIge1xyXG4gICAgICAgIHJldHVybiBuZXcgVGVhU3BlYWtIYW5kc2hha2VIYW5kbGVyKGNvbm5lY3Rpb24sIHRoaXMpO1xyXG4gICAgfVxyXG59IiwiaW1wb3J0IHtTZXR0aW5ncywgc2V0dGluZ3N9IGZyb20gXCIuLi8uLi9zZXR0aW5nc1wiO1xyXG5pbXBvcnQge3VwZGF0ZV9mb3J1bX0gZnJvbSBcIi4vVGVhRm9ydW1JZGVudGl0eVwiO1xyXG5cclxuZGVjbGFyZSBpbnRlcmZhY2UgV2luZG93IHtcclxuICAgIGdyZWNhcHRjaGE6IEdSZUNhcHRjaGE7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgR1JlQ2FwdGNoYSB7XHJcbiAgICByZW5kZXIoY29udGFpbmVyOiBzdHJpbmcgfCBIVE1MRWxlbWVudCwgcGFyYW1ldGVyczoge1xyXG4gICAgICAgIHNpdGVrZXk6IHN0cmluZztcclxuICAgICAgICB0aGVtZT86IFwiZGFya1wiIHwgXCJsaWdodFwiO1xyXG4gICAgICAgIHNpemU/OiBcImNvbXBhY3RcIiB8IFwibm9ybWFsXCI7XHJcblxyXG4gICAgICAgIHRhYmluZGV4PzogbnVtYmVyO1xyXG5cclxuICAgICAgICBjYWxsYmFjaz86ICh0b2tlbjogc3RyaW5nKSA9PiBhbnk7XHJcbiAgICAgICAgXCJleHBpcmVkLWNhbGxiYWNrXCI/OiAoKSA9PiBhbnk7XHJcbiAgICAgICAgXCJlcnJvci1jYWxsYmFja1wiPzogKGVycm9yOiBhbnkpID0+IGFueTtcclxuICAgIH0pIDogc3RyaW5nOyAvKiB3aWRnZXRfaWQgKi9cclxuXHJcbiAgICByZXNldCh3aWRnZXRfaWQ/OiBzdHJpbmcpO1xyXG59XHJcblxyXG5leHBvcnQgbmFtZXNwYWNlIGZvcnVtIHtcclxuICAgIGV4cG9ydCBuYW1lc3BhY2UgZ2NhcHRjaGEge1xyXG4gICAgICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICBpZih0eXBlb2YoKHdpbmRvdyBhcyBhbnkpLmdyZWNhcHRjaGEpID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcclxuICAgICAgICAgICAgICAgIHNjcmlwdC5hc3luYyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRpbWVvdXQ7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYWxsYmFja19uYW1lID0gXCJjYXB0Y2hhX2NhbGxiYWNrX1wiICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygpLnJlcGxhY2UoXCIuXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdC5vbmVycm9yID0gcmVqZWN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dbY2FsbGJhY2tfbmFtZV0gPSByZXNvbHZlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHQuc3JjID0gXCJodHRwczovL3d3dy5nb29nbGUuY29tL3JlY2FwdGNoYS9hcGkuanM/b25sb2FkPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGNhbGxiYWNrX25hbWUpICsgXCImcmVuZGVyPWV4cGxpY2l0XCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZChzY3JpcHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoXCJ0aW1lb3V0XCIpLCAxNTAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcih0cihcIkZhaWxlZCB0byBmZXRjaCByZWNhcHRjaGEgamF2YXNjcmlwdCBzb3VyY2U6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgdHIoXCJmYWlsZWQgdG8gZG93bmxvYWQgc291cmNlXCIpO1xyXG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgICAgICAgICBpZihzY3JpcHQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdC5vbmVycm9yID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3dbY2FsbGJhY2tfbmFtZV07XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZih0eXBlb2YoKHdpbmRvdyBhcyBhbnkpLmdyZWNhcHRjaGEpID09PSBcInVuZGVmaW5lZFwiKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgdHIoXCJmYWlsZWQgdG8gbG9hZCByZWNhcHRjaGFcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd24oY29udGFpbmVyOiBKUXVlcnksIGtleTogc3RyaW5nLCBjYWxsYmFja19kYXRhOiAodG9rZW46IHN0cmluZykgPT4gYW55KSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBpbml0aWFsaXplKCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBHLVJlY2FwdGNoYS4gRXJyb3I6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyB0cihcImluaXRpYWxpc2F0aW9uIGZhaWxlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihjb250YWluZXIuYXR0cihcImNhcHRjaGEtdXVpZFwiKSlcclxuICAgICAgICAgICAgICAgICh3aW5kb3cgYXMgYW55KS5ncmVjYXB0Y2hhLnJlc2V0KGNvbnRhaW5lci5hdHRyKFwiY2FwdGNoYS11dWlkXCIpKTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYXR0cihcImNhcHRjaGEtdXVpZFwiLCAod2luZG93IGFzIGFueSkuZ3JlY2FwdGNoYS5yZW5kZXIoY29udGFpbmVyWzBdLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJzaXRla2V5XCI6IGtleSxcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tfZGF0YVxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwaV91cmwoKSB7XHJcbiAgICAgICAgcmV0dXJuIHNldHRpbmdzLnN0YXRpY19nbG9iYWwoU2V0dGluZ3MuS0VZX1RFQUZPUk9fVVJMKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRGF0YSB7XHJcbiAgICAgICAgcmVhZG9ubHkgYXV0aF9rZXk6IHN0cmluZztcclxuICAgICAgICByZWFkb25seSByYXc6IHN0cmluZztcclxuICAgICAgICByZWFkb25seSBzaWduOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHBhcnNlZDoge1xyXG4gICAgICAgICAgICB1c2VyX2lkOiBudW1iZXI7XHJcbiAgICAgICAgICAgIHVzZXJfbmFtZTogc3RyaW5nO1xyXG5cclxuICAgICAgICAgICAgZGF0YV9hZ2U6IG51bWJlcjtcclxuXHJcbiAgICAgICAgICAgIHVzZXJfZ3JvdXBfaWQ6IG51bWJlcjtcclxuXHJcbiAgICAgICAgICAgIGlzX3N0YWZmOiBib29sZWFuO1xyXG4gICAgICAgICAgICB1c2VyX2dyb3VwczogbnVtYmVyW107XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoYXV0aDogc3RyaW5nLCByYXc6IHN0cmluZywgc2lnbjogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXV0aF9rZXkgPSBhdXRoO1xyXG4gICAgICAgICAgICB0aGlzLnJhdyA9IHJhdztcclxuICAgICAgICAgICAgdGhpcy5zaWduID0gc2lnbjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucGFyc2VkID0gSlNPTi5wYXJzZShyYXcpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGRhdGFfanNvbigpIDogc3RyaW5nIHsgcmV0dXJuIHRoaXMucmF3OyB9XHJcbiAgICAgICAgZGF0YV9zaWduKCkgOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zaWduOyB9XHJcblxyXG4gICAgICAgIG5hbWUoKSA6IHN0cmluZyB7IHJldHVybiB0aGlzLnBhcnNlZC51c2VyX25hbWU7IH1cclxuXHJcbiAgICAgICAgdXNlcl9pZCgpIHsgcmV0dXJuIHRoaXMucGFyc2VkLnVzZXJfaWQ7IH1cclxuICAgICAgICB1c2VyX2dyb3VwKCkgeyByZXR1cm4gdGhpcy5wYXJzZWQudXNlcl9ncm91cF9pZDsgfVxyXG5cclxuICAgICAgICBpc19zdHVmZigpIDogYm9vbGVhbiB7IHJldHVybiB0aGlzLnBhcnNlZC5pc19zdGFmZjsgfVxyXG4gICAgICAgIGlzX3ByZW1pdW0oKSA6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5wYXJzZWQudXNlcl9ncm91cHMuaW5kZXhPZig1KSAhPSAtMTsgfVxyXG5cclxuICAgICAgICBkYXRhX2FnZSgpIDogRGF0ZSB7IHJldHVybiBuZXcgRGF0ZSh0aGlzLnBhcnNlZC5kYXRhX2FnZSk7IH1cclxuXHJcbiAgICAgICAgaXNfZXhwaXJlZCgpIDogYm9vbGVhbiB7IHJldHVybiB0aGlzLnBhcnNlZC5kYXRhX2FnZSArIDQ4ICogNjAgKiA2MCAqIDEwMDAgPCBEYXRlLm5vdygpOyB9XHJcbiAgICAgICAgc2hvdWxkX3JlbmV3KCkgOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucGFyc2VkLmRhdGFfYWdlICsgMjQgKiA2MCAqIDYwICogMTAwMCA8IERhdGUubm93KCk7IH0gLyogcmVuZXcgZGF0YSBhbGwgMjRocnMgKi9cclxuICAgIH1cclxuICAgIGxldCBfZGF0YTogRGF0YSB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbG9nZ2VkX2luKCkgOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gISFfZGF0YSAmJiAhX2RhdGEuaXNfZXhwaXJlZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBkYXRhKCkgOiBEYXRhIHsgcmV0dXJuIF9kYXRhOyB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBMb2dpblJlc3VsdCB7XHJcbiAgICAgICAgc3RhdHVzOiBcInN1Y2Nlc3NcIiB8IFwiY2FwdGNoYVwiIHwgXCJlcnJvclwiO1xyXG5cclxuICAgICAgICBlcnJvcl9tZXNzYWdlPzogc3RyaW5nO1xyXG4gICAgICAgIGNhcHRjaGE/OiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFwiZ3JlLWNhcHRjaGFcIiB8IFwidW5rbm93blwiO1xyXG4gICAgICAgICAgICBkYXRhOiBhbnk7IC8qIGluIGNhc2Ugb2YgZ3JlLWNhcHRjaGEgaXQgd291bGQgYmUgdGhlIHNpZGUga2V5ICovXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9naW4odXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZywgY2FwdGNoYT86IGFueSkgOiBQcm9taXNlPExvZ2luUmVzdWx0PiB7XHJcbiAgICAgICAgbGV0IHJlc3BvbnNlO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCgpICsgXCI/d2ViLWFwaS92MS9sb2dpblwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiB1c2VybmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHBhc3N3b3JkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1lbWJlcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJnLXJlY2FwdGNoYS1yZXNwb25zZVwiOiBjYXB0Y2hhXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY3Jvc3NEb21haW46IHRydWUsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc29sdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICh4aHIsIHN0YXR1cywgZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codHIoXCJMb2dpbiByZXF1ZXN0IGZhaWxlZCAlbzogJW9cIiksIHN0YXR1cywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QodHIoXCJyZXF1ZXN0IGZhaWxlZFwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcImVycm9yXCIsXHJcbiAgICAgICAgICAgICAgICBlcnJvcl9tZXNzYWdlOiB0cihcImZhaWxlZCB0byBzZW5kIGxvZ2luIHJlcXVlc3RcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHJlc3BvbnNlW1wic3RhdHVzXCJdICE9PSBcIm9rXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0cihcIlJlc3BvbnNlIHN0YXR1cyBub3Qgb2tleS4gRXJyb3IgaGFwcGVuZDogJW9cIiksIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YXR1czogXCJlcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgZXJyb3JfbWVzc2FnZTogKHJlc3BvbnNlW1wiZXJyb3JzXCJdIHx8IFtdKVswXSB8fCB0cihcIlVua25vd24gZXJyb3JcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCFyZXNwb25zZVtcInN1Y2Nlc3NcIl0pIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0cihcIkxvZ2luIGZhaWxlZC4gUmVzcG9uc2UgJW9cIiksIHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlID0gdHIoXCJmYWlsZWQgdG8gbG9naW5cIik7XHJcbiAgICAgICAgICAgIGxldCBjYXB0Y2hhO1xyXG4gICAgICAgICAgICAvKiB1c2VyL3Bhc3N3b3JkIHdyb25nIHwgYW5kIG1heWJlIGNhcHRjaGEgcmVxdWlyZWQgKi9cclxuICAgICAgICAgICAgaWYocmVzcG9uc2VbXCJjb2RlXCJdID09IDEgfHwgcmVzcG9uc2VbXCJjb2RlXCJdID09IDMpXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gdHIoXCJJbnZhbGlkIHVzZXJuYW1lIG9yIHBhc3N3b3JkXCIpO1xyXG4gICAgICAgICAgICBpZihyZXNwb25zZVtcImNvZGVcIl0gPT0gMiB8fCByZXNwb25zZVtcImNvZGVcIl0gPT0gMykge1xyXG4gICAgICAgICAgICAgICAgY2FwdGNoYSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiByZXNwb25zZVtcImNhcHRjaGFcIl1bXCJ0eXBlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHJlc3BvbnNlW1wiY2FwdGNoYVwiXVtcInNpdGVLZXlcIl0gLy9UT0RPOiBXaHkgc28gc3RhdGljIGhlcmU/XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgaWYocmVzcG9uc2VbXCJjb2RlXCJdID09IDIpXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IHRyKFwiY2FwdGNoYSByZXF1aXJlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN0YXR1czogdHlwZW9mKGNhcHRjaGEpICE9PSBcInVuZGVmaW5lZFwiID8gXCJjYXB0Y2hhXCIgOiBcImVycm9yXCIsXHJcbiAgICAgICAgICAgICAgICBlcnJvcl9tZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgY2FwdGNoYTogY2FwdGNoYVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL2RvY3VtZW50LmNvb2tpZSA9IFwidXNlcl9kYXRhPVwiICsgcmVzcG9uc2VbXCJkYXRhXCJdICsgXCI7cGF0aD0vXCI7XHJcbiAgICAgICAgLy9kb2N1bWVudC5jb29raWUgPSBcInVzZXJfc2lnbj1cIiArIHJlc3BvbnNlW1wic2lnblwiXSArIFwiO3BhdGg9L1wiO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBfZGF0YSA9IG5ldyBEYXRhKHJlc3BvbnNlW1wiYXV0aC1rZXlcIl0sIHJlc3BvbnNlW1wiZGF0YVwiXSwgcmVzcG9uc2VbXCJzaWduXCJdKTtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJ0ZWFzcGVhay1mb3J1bS1kYXRhXCIsIHJlc3BvbnNlW1wiZGF0YVwiXSk7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwidGVhc3BlYWstZm9ydW0tc2lnblwiLCByZXNwb25zZVtcInNpZ25cIl0pO1xyXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInRlYXNwZWFrLWZvcnVtLWF1dGhcIiwgcmVzcG9uc2VbXCJhdXRoLWtleVwiXSk7XHJcbiAgICAgICAgICAgIHVwZGF0ZV9mb3J1bSgpO1xyXG4gICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0cihcIkZhaWxlZCB0byBwYXJzZSBmb3J1bSBnaXZlbiBkYXRhOiAlb1wiKSwgZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcImVycm9yXCIsXHJcbiAgICAgICAgICAgICAgICBlcnJvcl9tZXNzYWdlOiB0cihcIkZhaWxlZCB0byBwYXJzZSByZXNwb25zZSBkYXRhXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0YXR1czogXCJzdWNjZXNzXCJcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5ld19kYXRhKCkgOiBQcm9taXNlPFwic3VjY2Vzc1wiIHwgXCJsb2dpbi1yZXF1aXJlZFwiPiB7XHJcbiAgICAgICAgbGV0IHJlc3BvbnNlO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCgpICsgXCI/d2ViLWFwaS92MS9yZW5ldy1kYXRhXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXV0aC1rZXlcIjogX2RhdGEuYXV0aF9rZXlcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiByZXNvbHZlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBzdGF0dXMsIGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRyKFwiUmVuZXcgcmVxdWVzdCBmYWlsZWQgJW86ICVvXCIpLCBzdGF0dXMsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRyKFwicmVxdWVzdCBmYWlsZWRcIikpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgdGhyb3cgdHIoXCJmYWlsZWQgdG8gc2VuZCByZW5ldyByZXF1ZXN0XCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYocmVzcG9uc2VbXCJzdGF0dXNcIl0gIT09IFwib2tcIikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHRyKFwiUmVzcG9uc2Ugc3RhdHVzIG5vdCBva2V5LiBFcnJvciBoYXBwZW5kOiAlb1wiKSwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB0aHJvdyAocmVzcG9uc2VbXCJlcnJvcnNcIl0gfHwgW10pWzBdIHx8IHRyKFwiVW5rbm93biBlcnJvclwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCFyZXNwb25zZVtcInN1Y2Nlc3NcIl0pIHtcclxuICAgICAgICAgICAgaWYocmVzcG9uc2VbXCJjb2RlXCJdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImxvZ2luLXJlcXVpcmVkXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgXCJpbnZhbGlkIGVycm9yIGNvZGUgKFwiICsgcmVzcG9uc2VbXCJjb2RlXCJdICsgXCIpXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCFyZXNwb25zZVtcImRhdGFcIl0gfHwgIXJlc3BvbnNlW1wic2lnblwiXSlcclxuICAgICAgICAgICAgdGhyb3cgdHIoXCJyZXNwb25zZSBtaXNzaW5nIGRhdGFcIik7XHJcblxyXG4gICAgICAgIGNvbnNvbGUuZGVidWcodHIoXCJSZW5ldyBzdWNjZWVkZWQuIFBhcnNpbmcgZGF0YS5cIikpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBfZGF0YSA9IG5ldyBEYXRhKF9kYXRhLmF1dGhfa2V5LCByZXNwb25zZVtcImRhdGFcIl0sIHJlc3BvbnNlW1wic2lnblwiXSk7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwidGVhc3BlYWstZm9ydW0tZGF0YVwiLCByZXNwb25zZVtcImRhdGFcIl0pO1xyXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInRlYXNwZWFrLWZvcnVtLXNpZ25cIiwgcmVzcG9uc2VbXCJzaWduXCJdKTtcclxuICAgICAgICAgICAgdXBkYXRlX2ZvcnVtKCk7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHRyKFwiRmFpbGVkIHRvIHBhcnNlIGZvcnVtIGdpdmVuIGRhdGE6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IHRyKFwiZmFpbGVkIHRvIHBhcnNlIGRhdGFcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gXCJzdWNjZXNzXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ291dCgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYoIWxvZ2dlZF9pbigpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCByZXNwb25zZTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwoKSArIFwiP3dlYi1hcGkvdjEvbG9nb3V0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNyb3NzRG9tYWluOiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXV0aC1rZXlcIjogX2RhdGEuYXV0aF9rZXlcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiByZXNvbHZlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBzdGF0dXMsIGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRyKFwiTG9nb3V0IHJlcXVlc3QgZmFpbGVkICVvOiAlb1wiKSwgc3RhdHVzLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh0cihcInJlcXVlc3QgZmFpbGVkXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHRocm93IHRyKFwiZmFpbGVkIHRvIHNlbmQgbG9nb3V0IHJlcXVlc3RcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihyZXNwb25zZVtcInN0YXR1c1wiXSAhPT0gXCJva1wiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJSZXNwb25zZSBzdGF0dXMgbm90IG9rZXkuIEVycm9yIGhhcHBlbmQ6ICVvXCIpLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgIHRocm93IChyZXNwb25zZVtcImVycm9yc1wiXSB8fCBbXSlbMF0gfHwgdHIoXCJVbmtub3duIGVycm9yXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIXJlc3BvbnNlW1wic3VjY2Vzc1wiXSkge1xyXG4gICAgICAgICAgICAvKiBjb2RlIDEgbWVhbnMgbm90IGxvZ2dlZCBpbiwgaXRzIGFuIHN1Y2Nlc3MgKi9cclxuICAgICAgICAgICAgaWYocmVzcG9uc2VbXCJjb2RlXCJdICE9IDEpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IFwiaW52YWxpZCBlcnJvciBjb2RlIChcIiArIHJlc3BvbnNlW1wiY29kZVwiXSArIFwiKVwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBfZGF0YSA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShcInRlYXNwZWFrLWZvcnVtLWRhdGFcIik7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJ0ZWFzcGVhay1mb3J1bS1zaWduXCIpO1xyXG4gICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFwidGVhc3BlYWstZm9ydW0tYXV0aFwiKTtcclxuICAgICAgICB1cGRhdGVfZm9ydW0oKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkZXIucmVnaXN0ZXJfdGFzayhsb2FkZXIuU3RhZ2UuSkFWQVNDUklQVF9JTklUSUFMSVpJTkcsIHtcclxuICAgICAgICBuYW1lOiBcIlRlYUZvcm8gaW5pdGlhbGl6ZVwiLFxyXG4gICAgICAgIHByaW9yaXR5OiAxMCxcclxuICAgICAgICBmdW5jdGlvbjogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByYXdfZGF0YSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwidGVhc3BlYWstZm9ydW0tZGF0YVwiKTtcclxuICAgICAgICAgICAgY29uc3QgcmF3X3NpZ24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInRlYXNwZWFrLWZvcnVtLXNpZ25cIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGZvcnVtX2F1dGggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInRlYXNwZWFrLWZvcnVtLWF1dGhcIik7XHJcbiAgICAgICAgICAgIGlmKCFyYXdfZGF0YSB8fCAhcmF3X3NpZ24gfHwgIWZvcnVtX2F1dGgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRyKFwiTm8gVGVhRm9ybyBhdXRoZW50aWZpY2F0aW9uIGZvdW5kLiBUZWFGb3JvIGNvbm5lY3Rpb24gc3RhdHVzOiB1bmNvbm5lY3RlZFwiKSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBfZGF0YSA9IG5ldyBEYXRhKGZvcnVtX2F1dGgsIHJhd19kYXRhLCByYXdfc2lnbik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodHIoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBUZWFGb3JvIGNvbm5lY3Rpb24gZnJvbSBsb2NhbCBkYXRhLiBFcnJvcjogJW9cIiksIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihfZGF0YS5zaG91bGRfcmVuZXcoKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKHRyKFwiVGVhRm9ybyBkYXRhIHNob3VsZCBiZSByZW5ld2VkLiBFeGVjdXRpbmcgcmVuZXcuXCIpKTtcclxuICAgICAgICAgICAgICAgIHJlbmV3X2RhdGEoKS50aGVuKHN0YXR1cyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoc3RhdHVzID09PSBcInN1Y2Nlc3NcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8odHIoXCJUZWFGb3JvIGRhdGEgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IHJlbmV3ZWQuXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4odHIoXCJGYWlsZWQgdG8gcmVuZXcgVGVhRm9ybyBkYXRhLiBOZXcgbG9naW4gcmVxdWlyZWQuXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJ0ZWFzcGVhay1mb3J1bS1kYXRhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShcInRlYXNwZWFrLWZvcnVtLXNpZ25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFwidGVhc3BlYWstZm9ydW0tYXV0aFwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHRyKFwiRmFpbGVkIHRvIHJlbmV3IFRlYUZvcm8gZGF0YS4gQW4gZXJyb3Igb2NjdXJyZWQ6ICVvXCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoX2RhdGEgJiYgX2RhdGEuaXNfZXhwaXJlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKHRyKFwiVGVhRm9ybyBkYXRhIGlzIGV4cGlyZWQuIFRlYUZvcm8gY29ubmVjdGlvbiBpc24ndCBhdmFpbGFibGUhXCIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwidWkvZWxlbWVudHMvbW9kYWwudHNcIiAvPlxyXG4vL1VzZWQgYnkgQ2VydEFjY2VwdCBwb3B1cFxyXG5cclxuaW1wb3J0IHtsb2csIExvZ0NhdGVnb3J5fSBmcm9tIFwiLi9sb2dcIjtcclxuaW1wb3J0IHtjcmVhdGVFcnJvck1vZGFsfSBmcm9tIFwiLi91aS9lbGVtZW50cy9tb2RhbFwiO1xyXG5cclxuaWYodHlwZW9mKGN1c3RvbUVsZW1lbnRzKSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBjbGFzcyBYX1Byb3BlcnRpZXMgZXh0ZW5kcyBIVE1MRWxlbWVudCB7fVxyXG4gICAgICAgIGNsYXNzIFhfUHJvcGVydHkgZXh0ZW5kcyBIVE1MRWxlbWVudCB7fVxyXG5cclxuICAgICAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtcHJvcGVydGllcycsIFhfUHJvcGVydGllcywgeyBleHRlbmRzOiAnZGl2JyB9KTtcclxuICAgICAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtcHJvcGVydHknLCBYX1Byb3BlcnR5LCB7IGV4dGVuZHM6ICdkaXYnIH0pO1xyXG4gICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihcImZhaWxlZCB0byBkZWZpbmUgY29zdHVtIGVsZW1lbnRzXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiBUID0gdmFsdWUgdHlwZSAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFNldHRpbmdzS2V5PFQ+IHtcclxuICAgIGtleTogc3RyaW5nO1xyXG5cclxuICAgIGZhbGxiYWNrX2tleXM/OiBzdHJpbmcgfCBzdHJpbmdbXTtcclxuICAgIGZhbGxiYWNrX2ltcG9ydHM/OiB7W2tleTogc3RyaW5nXToodmFsdWU6IHN0cmluZykgPT4gVH07XHJcbiAgICBkZXNjcmlwdGlvbj86IHN0cmluZztcclxuICAgIGRlZmF1bHRfdmFsdWU/OiBUO1xyXG5cclxuICAgIHJlcXVpcmVfcmVzdGFydD86IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTZXR0aW5nc0Jhc2Uge1xyXG4gICAgcHJvdGVjdGVkIHN0YXRpYyByZWFkb25seSBVUERBVEVfRElSRUNUOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIHRyYW5zZm9ybVN0Tz88VD4oaW5wdXQ/OiBzdHJpbmcsIF9kZWZhdWx0PzogVCwgZGVmYXVsdF90eXBlPzogc3RyaW5nKSA6IFQge1xyXG4gICAgICAgIGRlZmF1bHRfdHlwZSA9IGRlZmF1bHRfdHlwZSB8fCB0eXBlb2YgX2RlZmF1bHQ7XHJcblxyXG4gICAgICAgIGlmICAgICAgKHR5cGVvZiBpbnB1dCA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIF9kZWZhdWx0O1xyXG4gICAgICAgIGlmICAgICAgKGRlZmF1bHRfdHlwZSA9PT0gXCJzdHJpbmdcIikgICAgIHJldHVybiBpbnB1dCBhcyBhbnk7XHJcbiAgICAgICAgZWxzZSBpZiAoZGVmYXVsdF90eXBlID09PSBcIm51bWJlclwiKSAgICAgcmV0dXJuIHBhcnNlSW50KGlucHV0KSBhcyBhbnk7XHJcbiAgICAgICAgZWxzZSBpZiAoZGVmYXVsdF90eXBlID09PSBcImJvb2xlYW5cIikgICAgcmV0dXJuIChpbnB1dCA9PSBcIjFcIiB8fCBpbnB1dCA9PSBcInRydWVcIikgYXMgYW55O1xyXG4gICAgICAgIGVsc2UgaWYgKGRlZmF1bHRfdHlwZSA9PT0gXCJ1bmRlZmluZWRcIikgICByZXR1cm4gaW5wdXQgYXMgYW55O1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGlucHV0KSBhcyBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHN0YXRpYyB0cmFuc2Zvcm1PdFM/PFQ+KGlucHV0OiBUKSA6IHN0cmluZyB7XHJcbiAgICAgICAgaWYgICAgICAodHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiKSAgICAgcmV0dXJuIGlucHV0IGFzIHN0cmluZztcclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09IFwibnVtYmVyXCIpICAgICByZXR1cm4gaW5wdXQudG9TdHJpbmcoKTtcclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09IFwiYm9vbGVhblwiKSAgICByZXR1cm4gaW5wdXQgPyBcIjFcIiA6IFwiMFwiO1xyXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJ1bmRlZmluZWRcIikgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGlucHV0KTtcclxuICAgIH1cclxuXHJcbiAgICBwcm90ZWN0ZWQgc3RhdGljIHJlc29sdmVLZXk8VD4oa2V5OiBTZXR0aW5nc0tleTxUPiwgX2RlZmF1bHQ6IFQsIHJlc29sdmVyOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZyB8IGJvb2xlYW4sIGRlZmF1bHRfdHlwZT86IHN0cmluZykgOiBUIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSByZXNvbHZlcihrZXkua2V5KTtcclxuICAgICAgICBpZighdmFsdWUpIHtcclxuICAgICAgICAgICAgLyogdHJ5aW5nIGZhbGxiYWNrcyAqL1xyXG4gICAgICAgICAgICBmb3IoY29uc3QgZmFsbGJhY2sgb2Yga2V5LmZhbGxiYWNrX2tleXMgfHwgW10pIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzb2x2ZXIoZmFsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mKHZhbHVlKSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGZhbGxiYWNrIGtleSBzdWNjZWVkZWQgKi9cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRlciA9IChrZXkuZmFsbGJhY2tfaW1wb3J0cyB8fCB7fSlbZmFsbGJhY2tdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGltcG9ydGVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW1wb3J0ZXIodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGVvZih2YWx1ZSkgIT09ICdzdHJpbmcnKVxyXG4gICAgICAgICAgICByZXR1cm4gX2RlZmF1bHQ7XHJcblxyXG4gICAgICAgIHJldHVybiBTZXR0aW5nc0Jhc2UudHJhbnNmb3JtU3RPKHZhbHVlIGFzIHN0cmluZywgX2RlZmF1bHQsIGRlZmF1bHRfdHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvdGVjdGVkIHN0YXRpYyBrZXlpZnk8VD4oa2V5OiBzdHJpbmcgfCBTZXR0aW5nc0tleTxUPikgOiBTZXR0aW5nc0tleTxUPiB7XHJcbiAgICAgICAgaWYodHlwZW9mKGtleSkgPT09IFwic3RyaW5nXCIpXHJcbiAgICAgICAgICAgIHJldHVybiB7a2V5OiBrZXl9O1xyXG4gICAgICAgIGlmKHR5cGVvZihrZXkpID09PSBcIm9iamVjdFwiICYmIGtleS5rZXkpXHJcbiAgICAgICAgICAgIHJldHVybiBrZXk7XHJcbiAgICAgICAgdGhyb3cgXCJrZXkgaXMgbm90IGEga2V5XCI7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTdGF0aWNTZXR0aW5ncyBleHRlbmRzIFNldHRpbmdzQmFzZSB7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBfaW5zdGFuY2U6IFN0YXRpY1NldHRpbmdzO1xyXG4gICAgc3RhdGljIGdldCBpbnN0YW5jZSgpIDogU3RhdGljU2V0dGluZ3Mge1xyXG4gICAgICAgIGlmKCF0aGlzLl9pbnN0YW5jZSlcclxuICAgICAgICAgICAgdGhpcy5faW5zdGFuY2UgPSBuZXcgU3RhdGljU2V0dGluZ3ModHJ1ZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luc3RhbmNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByb3RlY3RlZCBfaGFuZGxlOiBTdGF0aWNTZXR0aW5ncztcclxuICAgIHByb3RlY3RlZCBfc3RhdGljUHJvcHNUYWc6IEpRdWVyeTtcclxuXHJcbiAgICBwcm90ZWN0ZWQgY29uc3RydWN0b3IoX3Jlc2VydmVkID0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICBpZihfcmVzZXJ2ZWQgJiYgIVN0YXRpY1NldHRpbmdzLl9pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9zdGF0aWNQcm9wc1RhZyA9ICQoXCIjcHJvcGVydGllc1wiKTtcclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplU3RhdGljKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlID0gU3RhdGljU2V0dGluZ3MuaW5zdGFuY2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaW5pdGlhbGl6ZVN0YXRpYygpIHtcclxuICAgICAgICBsZXQgc2VhcmNoO1xyXG4gICAgICAgIGlmKHdpbmRvdy5vcGVuZXIgJiYgd2luZG93Lm9wZW5lciAhPT0gd2luZG93KSB7XHJcbiAgICAgICAgICAgIHNlYXJjaCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpLnNlYXJjaDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZWFyY2ggPSBsb2NhdGlvbi5zZWFyY2g7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZWFyY2guc3Vic3RyKDEpLnNwbGl0KFwiJlwiKS5mb3JFYWNoKHBhcnQgPT4ge1xyXG4gICAgICAgICAgICBsZXQgaXRlbSA9IHBhcnQuc3BsaXQoXCI9XCIpO1xyXG4gICAgICAgICAgICAkKFwiPHgtcHJvcGVydHk+PC94LXByb3BlcnR5PlwiKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJrZXlcIiwgaXRlbVswXSlcclxuICAgICAgICAgICAgICAgIC5hdHRyKFwidmFsdWVcIiwgaXRlbVsxXSlcclxuICAgICAgICAgICAgICAgIC5hcHBlbmRUbyh0aGlzLl9zdGF0aWNQcm9wc1RhZyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljPzxUPihrZXk6IHN0cmluZyB8IFNldHRpbmdzS2V5PFQ+LCBfZGVmYXVsdD86IFQsIGRlZmF1bHRfdHlwZT86IHN0cmluZykgOiBUIHtcclxuICAgICAgICBpZih0aGlzLl9oYW5kbGUpIHJldHVybiB0aGlzLl9oYW5kbGUuc3RhdGljPFQ+KGtleSwgX2RlZmF1bHQsIGRlZmF1bHRfdHlwZSk7XHJcblxyXG4gICAgICAgIGtleSA9IFN0YXRpY1NldHRpbmdzLmtleWlmeShrZXkpO1xyXG4gICAgICAgIHJldHVybiBTdGF0aWNTZXR0aW5ncy5yZXNvbHZlS2V5KGtleSwgX2RlZmF1bHQsIGtleSA9PiB7XHJcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSB0aGlzLl9zdGF0aWNQcm9wc1RhZy5maW5kKFwiW2tleT0nXCIgKyBrZXkgKyBcIiddXCIpO1xyXG4gICAgICAgICAgICBpZihyZXN1bHQubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0Lmxhc3QoKS5hdHRyKCd2YWx1ZScpKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0sIGRlZmF1bHRfdHlwZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZGVsZXRlU3RhdGljPFQ+KGtleTogc3RyaW5nIHwgU2V0dGluZ3NLZXk8VD4pIHtcclxuICAgICAgICBpZih0aGlzLl9oYW5kbGUpIHtcclxuICAgICAgICAgICAgdGhpcy5faGFuZGxlLmRlbGV0ZVN0YXRpYzxUPihrZXkpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBrZXkgPSBTdGF0aWNTZXR0aW5ncy5rZXlpZnkoa2V5KTtcclxuICAgICAgICBsZXQgcmVzdWx0ID0gdGhpcy5fc3RhdGljUHJvcHNUYWcuZmluZChcIltrZXk9J1wiICsga2V5LmtleSArIFwiJ11cIik7XHJcbiAgICAgICAgaWYocmVzdWx0Lmxlbmd0aCAhPSAwKSByZXN1bHQuZGV0YWNoKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTZXR0aW5ncyBleHRlbmRzIFN0YXRpY1NldHRpbmdzIHtcclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfVVNFUl9JU19ORVc6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ3VzZXJfaXNfbmV3X3VzZXInLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IHRydWVcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9ESVNBQkxFX0NPU01FVElDX1NMT1dET1dOOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdkaXNhYmxlX2Nvc21ldGljX3Nsb3dkb3duJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0Rpc2FibGUgdGhlIGNvc21ldGljIHNsb3dkb3dzIGluIHNvbWUgcHJvY2Vzc2VzLCBsaWtlIGljb24gdXBsb2FkLidcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9ESVNBQkxFX0NPTlRFWFRfTUVOVTogU2V0dGluZ3NLZXk8Ym9vbGVhbj4gPSB7XHJcbiAgICAgICAga2V5OiAnZGlzYWJsZUNvbnRleHRNZW51JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0Rpc2FibGUgdGhlIGNvbnRleHQgbWVudSBmb3IgdGhlIGNoYW5uZWwgdHJlZSB3aGljaCBhbGxvd3MgdG8gZGVidWcgdGhlIERPTSBlYXNpZXInXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfRElTQUJMRV9HTE9CQUxfQ09OVEVYVF9NRU5VOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdkaXNhYmxlR2xvYmFsQ29udGV4dE1lbnUnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzYWJsZSB0aGUgZ2VuZXJhbCBjb250ZXh0IG1lbnUgcHJldmVudGlvbicsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogZmFsc2VcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9ESVNBQkxFX1VOTE9BRF9ESUFMT0c6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ2Rpc2FibGVVbmxvYWREaWFsb2cnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzYWJsZXMgdGhlIHVubG9hZCBwb3B1cCBvbiBzaWRlIGNsb3NpbmcnXHJcbiAgICB9O1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9ESVNBQkxFX1ZPSUNFOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdkaXNhYmxlVm9pY2UnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzYWJsZXMgdGhlIHZvaWNlIGJyaWRnZS4gSWYgZGlzYWJsZWQsIHRoZSBhdWRpbyBhbmQgY29kZWMgd29ya2VycyBhcmVuXFwndCByZXF1aXJlZCBhbnltb3JlJ1xyXG4gICAgfTtcclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfRElTQUJMRV9NVUxUSV9TRVNTSU9OOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdkaXNhYmxlTXVsdGlTZXNzaW9uJyxcclxuICAgICAgICBkZWZhdWx0X3ZhbHVlOiBmYWxzZSxcclxuICAgICAgICByZXF1aXJlX3Jlc3RhcnQ6IHRydWVcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9MT0FEX0RVTU1ZX0VSUk9SOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdkdW1teV9sb2FkX2Vycm9yJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RyaWdnZXJzIGEgbG9hZGluZyBlcnJvciBhdCB0aGUgZW5kIG9mIHRoZSBsb2FkaW5nIHByb2Nlc3MuJ1xyXG4gICAgfTtcclxuXHJcbiAgICAvKiBDb250cm9sIGJhciAqL1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DT05UUk9MX01VVEVfSU5QVVQ6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ211dGVfaW5wdXQnXHJcbiAgICB9O1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DT05UUk9MX01VVEVfT1VUUFVUOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdtdXRlX291dHB1dCdcclxuICAgIH07XHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX0NPTlRST0xfU0hPV19RVUVSSUVTOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdzaG93X3NlcnZlcl9xdWVyaWVzJ1xyXG4gICAgfTtcclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfQ09OVFJPTF9DSEFOTkVMX1NVQlNDUklCRV9BTEw6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ2NoYW5uZWxfc3Vic2NyaWJlX2FsbCdcclxuICAgIH07XHJcblxyXG4gICAgLyogQ29ubmVjdCBwYXJhbWV0ZXJzICovXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX0ZMQUdfQ09OTkVDVF9ERUZBVUxUOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdjb25uZWN0X2RlZmF1bHQnXHJcbiAgICB9O1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DT05ORUNUX0FERFJFU1M6IFNldHRpbmdzS2V5PHN0cmluZz4gPSB7XHJcbiAgICAgICAga2V5OiAnY29ubmVjdF9hZGRyZXNzJ1xyXG4gICAgfTtcclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfQ09OTkVDVF9QUk9GSUxFOiBTZXR0aW5nc0tleTxzdHJpbmc+ID0ge1xyXG4gICAgICAgIGtleTogJ2Nvbm5lY3RfcHJvZmlsZScsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogJ2RlZmF1bHQnXHJcbiAgICB9O1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DT05ORUNUX1VTRVJOQU1FOiBTZXR0aW5nc0tleTxzdHJpbmc+ID0ge1xyXG4gICAgICAgIGtleTogJ2Nvbm5lY3RfdXNlcm5hbWUnXHJcbiAgICB9O1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DT05ORUNUX1BBU1NXT1JEOiBTZXR0aW5nc0tleTxzdHJpbmc+ID0ge1xyXG4gICAgICAgIGtleTogJ2Nvbm5lY3RfcGFzc3dvcmQnXHJcbiAgICB9O1xyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9GTEFHX0NPTk5FQ1RfUEFTU1dPUkQ6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ2Nvbm5lY3RfcGFzc3dvcmRfaGFzaGVkJ1xyXG4gICAgfTtcclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfQ09OTkVDVF9ISVNUT1JZOiBTZXR0aW5nc0tleTxzdHJpbmc+ID0ge1xyXG4gICAgICAgIGtleTogJ2Nvbm5lY3RfaGlzdG9yeSdcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DT05ORUNUX05PX0ROU1BST1hZOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdjb25uZWN0X25vX2Ruc3Byb3h5JyxcclxuICAgICAgICBkZWZhdWx0X3ZhbHVlOiBmYWxzZVxyXG4gICAgfTtcclxuXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX0NFUlRJRklDQVRFX0NBTExCQUNLOiBTZXR0aW5nc0tleTxzdHJpbmc+ID0ge1xyXG4gICAgICAgIGtleTogJ2NlcnRpZmljYXRlX2NhbGxiYWNrJ1xyXG4gICAgfTtcclxuXHJcbiAgICAvKiBzb3VuZHMgKi9cclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfU09VTkRfTUFTVEVSOiBTZXR0aW5nc0tleTxudW1iZXI+ID0ge1xyXG4gICAgICAgIGtleTogJ2F1ZGlvX21hc3Rlcl92b2x1bWUnLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IDEwMFxyXG4gICAgfTtcclxuXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX1NPVU5EX01BU1RFUl9TT1VORFM6IFNldHRpbmdzS2V5PG51bWJlcj4gPSB7XHJcbiAgICAgICAga2V5OiAnYXVkaW9fbWFzdGVyX3ZvbHVtZV9zb3VuZHMnLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IDEwMFxyXG4gICAgfTtcclxuXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX0NIQVRfRklYRURfVElNRVNUQU1QUzogU2V0dGluZ3NLZXk8Ym9vbGVhbj4gPSB7XHJcbiAgICAgICAga2V5OiAnY2hhdF9maXhlZF90aW1lc3RhbXBzJyxcclxuICAgICAgICBkZWZhdWx0X3ZhbHVlOiBmYWxzZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZXMgZml4ZWQgdGltZXN0YW1wcyBmb3IgY2hhdCBtZXNzYWdlcyBhbmQgZGlzYWJsZWQgdGhlIHVwZGF0aW5nIG9uY2UgKDIgc2Vjb25kcyBhZ28uLi4gZXRjKSdcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DSEFUX0NPTExPUVVJQUxfVElNRVNUQU1QUzogU2V0dGluZ3NLZXk8Ym9vbGVhbj4gPSB7XHJcbiAgICAgICAga2V5OiAnY2hhdF9jb2xsb3F1aWFsX3RpbWVzdGFtcHMnLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IHRydWUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdFbmFibGVkIGNvbGxvcXVpYWwgdGltZXN0YW1wIGZvcm1hdHRpbmcgbGlrZSBcIlllc3RlcmRheSBhdCAuLi5cIiBvciBcIlRvZGF5IGF0IC4uLlwiJ1xyXG4gICAgfTtcclxuXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX0NIQVRfQ09MT1JFRF9FTU9KSUVTOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdjaGF0X2NvbG9yZWRfZW1vamllcycsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogdHJ1ZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZXMgY29sb3JlZCBlbW9qaWVzIHBvd2VyZWQgYnkgVHdlbW9qaSdcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DSEFUX1RBR19VUkxTOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdjaGF0X3RhZ191cmxzJyxcclxuICAgICAgICBkZWZhdWx0X3ZhbHVlOiB0cnVlLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQXV0b21hdGljYWxseSBsaW5rIHVybHMgd2l0aCBbdXJsXSdcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DSEFUX0VOQUJMRV9NQVJLRE9XTjogU2V0dGluZ3NLZXk8Ym9vbGVhbj4gPSB7XHJcbiAgICAgICAga2V5OiAnY2hhdF9lbmFibGVfbWFya2Rvd24nLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IHRydWUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdFbmFibGVkIG1hcmtkb3duIGNoYXQgc3VwcG9ydC4nXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfQ0hBVF9FTkFCTEVfQkJDT0RFOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdjaGF0X2VuYWJsZV9iYmNvZGUnLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IGZhbHNlLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRW5hYmxlZCBiYmNvZGUgc3VwcG9ydCBpbiBjaGF0LidcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DSEFUX0lNQUdFX1dISVRFTElTVF9SRUdFWDogU2V0dGluZ3NLZXk8c3RyaW5nPiA9IHtcclxuICAgICAgICBrZXk6ICdjaGF0X2ltYWdlX3doaXRlbGlzdF9yZWdleCcsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogSlNPTi5zdHJpbmdpZnkoW10pXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfU1dJVENIX0lOU1RBTlRfQ0hBVDogU2V0dGluZ3NLZXk8Ym9vbGVhbj4gPSB7XHJcbiAgICAgICAga2V5OiAnc3dpdGNoX2luc3RhbnRfY2hhdCcsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogdHJ1ZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdGx5IHN3aXRjaCB0byBjaGFubmVsIGNoYXQgb24gY2hhbm5lbCBzZWxlY3QnXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfU1dJVENIX0lOU1RBTlRfQ0xJRU5UOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdzd2l0Y2hfaW5zdGFudF9jbGllbnQnLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IHRydWUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdEaXJlY3RseSBzd2l0Y2ggdG8gY2xpZW50IGluZm8gb24gY2xpZW50IHNlbGVjdCdcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9IT1NUQkFOTkVSX0JBQ0tHUk9VTkQ6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ2hvc3RiYW5uZXJfYmFja2dyb3VuZCcsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogZmFsc2UsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdFbmFibGVzIGEgZGVmYXVsdCBiYWNrZ3JvdW5kIGJlZ2luZCB0aGUgaG9zdGJhbm5lcidcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9DSEFOTkVMX0VESVRfQURWQU5DRUQ6IFNldHRpbmdzS2V5PGJvb2xlYW4+ID0ge1xyXG4gICAgICAgIGtleTogJ2NoYW5uZWxfZWRpdF9hZHZhbmNlZCcsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogZmFsc2UsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdFZGl0IGNoYW5uZWxzIGluIGFkdmFuY2VkIG1vZGUgd2l0aCBhIGxvdCBtb3JlIHNldHRpbmdzJ1xyXG4gICAgfTtcclxuXHJcbiAgICBzdGF0aWMgcmVhZG9ubHkgS0VZX1BFUk1JU1NJT05TX1NIT1dfQUxMOiBTZXR0aW5nc0tleTxib29sZWFuPiA9IHtcclxuICAgICAgICBrZXk6ICdwZXJtaXNzaW9uc19zaG93X2FsbCcsXHJcbiAgICAgICAgZGVmYXVsdF92YWx1ZTogZmFsc2UsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdTaG93IGFsbCBwZXJtaXNzaW9ucyBldmVuIHRob3UgdGhleSBkb250IG1ha2Ugc2Vuc2UgZm9yIHRoZSBzZXJ2ZXIvY2hhbm5lbCBncm91cCdcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9URUFGT1JPX1VSTDogU2V0dGluZ3NLZXk8c3RyaW5nPiA9IHtcclxuICAgICAgICBrZXk6IFwidGVhZm9yb191cmxcIixcclxuICAgICAgICBkZWZhdWx0X3ZhbHVlOiBcImh0dHBzOi8vZm9ydW0udGVhc3BlYWsuZGUvXCJcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9GT05UX1NJWkU6IFNldHRpbmdzS2V5PG51bWJlcj4gPSB7XHJcbiAgICAgICAga2V5OiBcImZvbnRfc2l6ZVwiXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBLRVlfSUNPTl9TSVpFOiBTZXR0aW5nc0tleTxudW1iZXI+ID0ge1xyXG4gICAgICAgIGtleTogXCJpY29uX3NpemVcIixcclxuICAgICAgICBkZWZhdWx0X3ZhbHVlOiAxMDBcclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWV9MQVNUX0lOVklURV9MSU5LX1RZUEU6IFNldHRpbmdzS2V5PHN0cmluZz4gPSB7XHJcbiAgICAgICAga2V5OiBcImxhc3RfaW52aXRlX2xpbmtfdHlwZVwiLFxyXG4gICAgICAgIGRlZmF1bHRfdmFsdWU6IFwidGVhLXdlYlwiXHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyByZWFkb25seSBGTl9JTlZJVEVfTElOS19TRVRUSU5HOiAobmFtZTogc3RyaW5nKSA9PiBTZXR0aW5nc0tleTxzdHJpbmc+ID0gbmFtZSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAga2V5OiAnaW52aXRlX2xpbmtfc2V0dGluZ18nICsgbmFtZVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEZOX1NFUlZFUl9DSEFOTkVMX1NVQlNDUklCRV9NT0RFOiAoY2hhbm5lbF9pZDogbnVtYmVyKSA9PiBTZXR0aW5nc0tleTxudW1iZXI+ID0gY2hhbm5lbCA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAga2V5OiAnY2hhbm5lbF9zdWJzY3JpYmVfbW9kZV8nICsgY2hhbm5lbFxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEZOX1BST0ZJTEVfUkVDT1JEOiAobmFtZTogc3RyaW5nKSA9PiBTZXR0aW5nc0tleTxhbnk+ID0gbmFtZSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAga2V5OiAncHJvZmlsZV9yZWNvcmQnICsgbmFtZVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgc3RhdGljIHJlYWRvbmx5IEtFWVMgPSAoKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xyXG5cclxuICAgICAgICBmb3IoY29uc3Qga2V5IGluIFNldHRpbmdzKSB7XHJcbiAgICAgICAgICAgIGlmKCFrZXkudG9VcHBlckNhc2UoKS5zdGFydHNXaXRoKFwiS0VZX1wiKSlcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZihrZXkudG9VcHBlckNhc2UoKSA9PSBcIktFWVNcIilcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgcmVzdWx0LnB1c2goa2V5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHN0YXRpYyBpbml0aWFsaXplKCkge1xyXG4gICAgICAgIHNldHRpbmdzID0gbmV3IFNldHRpbmdzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYWNoZUdsb2JhbCA9IHt9O1xyXG4gICAgcHJpdmF0ZSBzYXZlV29ya2VyOiBOb2RlSlMuVGltZXI7XHJcbiAgICBwcml2YXRlIHVwZGF0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG5cclxuICAgICAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJzZXR0aW5ncy5nbG9iYWxcIik7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5jYWNoZUdsb2JhbCA9IEpTT04ucGFyc2UoanNvbik7XHJcbiAgICAgICAgfSBjYXRjaChlcnJvcikge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuR0VORVJBTCwgdHIoXCJGYWlsZWQgdG8gbG9hZCBnbG9iYWwgc2V0dGluZ3MhXFxuSnNvbjogJXNcXG5FcnJvcjogJW9cIiksIGpzb24sIGVycm9yKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHNob3dfcG9wdXAgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjcmVhdGVFcnJvck1vZGFsKHRyKFwiRmFpbGVkIHRvIGxvYWQgZ2xvYmFsIHNldHRpbmdzXCIpLCB0cihcIkZhaWxlZCB0byBsb2FkIGdsb2JhbCBjbGllbnQgc2V0dGluZ3MhXFxuTG9va3VwIGNvbnNvbGUgZm9yIG1vcmUgaW5mb3JtYXRpb24uXCIpKS5vcGVuKCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmKCFsb2FkZXIuZmluaXNoZWQoKSlcclxuICAgICAgICAgICAgICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5MT0FERUQsIHtcclxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogMCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlNldHRpbmdzIGVycm9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb246IGFzeW5jICgpID0+IHNob3dfcG9wdXAoKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHNob3dfcG9wdXAoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIXRoaXMuY2FjaGVHbG9iYWwpIHRoaXMuY2FjaGVHbG9iYWwgPSB7fTtcclxuICAgICAgICB0aGlzLnNhdmVXb3JrZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHRoaXMudXBkYXRlZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZSgpO1xyXG4gICAgICAgIH0sIDUgKiAxMDAwKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWNfZ2xvYmFsPzxUPihrZXk6IHN0cmluZyB8IFNldHRpbmdzS2V5PFQ+LCBfZGVmYXVsdD86IFQpIDogVCB7XHJcbiAgICAgICAgY29uc3QgYWN0dWFsX2RlZmF1bHQgPSB0eXBlb2YoX2RlZmF1bHQpID09PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZihrZXkpID09PSBcIm9iamVjdFwiICYmICdkZWZhdWx0X3ZhbHVlJyBpbiBrZXkgPyBrZXkuZGVmYXVsdF92YWx1ZSA6IF9kZWZhdWx0O1xyXG5cclxuICAgICAgICBjb25zdCBkZWZhdWx0X29iamVjdCA9IHsgc2VlZDogTWF0aC5yYW5kb20oKSB9IGFzIGFueTtcclxuICAgICAgICBsZXQgX3N0YXRpYyA9IHRoaXMuc3RhdGljKGtleSwgZGVmYXVsdF9vYmplY3QsIHR5cGVvZiBfZGVmYXVsdCk7XHJcbiAgICAgICAgaWYoX3N0YXRpYyAhPT0gZGVmYXVsdF9vYmplY3QpIHJldHVybiBTdGF0aWNTZXR0aW5ncy50cmFuc2Zvcm1TdE8oX3N0YXRpYywgYWN0dWFsX2RlZmF1bHQpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdsb2JhbDxUPihrZXksIGFjdHVhbF9kZWZhdWx0KTtcclxuICAgIH1cclxuXHJcbiAgICBnbG9iYWw/PFQ+KGtleTogc3RyaW5nIHwgU2V0dGluZ3NLZXk8VD4sIF9kZWZhdWx0PzogVCkgOiBUIHtcclxuICAgICAgICBjb25zdCBhY3R1YWxfZGVmYXVsdCA9IHR5cGVvZihfZGVmYXVsdCkgPT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mKGtleSkgPT09IFwib2JqZWN0XCIgJiYgJ2RlZmF1bHRfdmFsdWUnIGluIGtleSA/IGtleS5kZWZhdWx0X3ZhbHVlIDogX2RlZmF1bHQ7XHJcbiAgICAgICAgcmV0dXJuIFN0YXRpY1NldHRpbmdzLnJlc29sdmVLZXkoU2V0dGluZ3Mua2V5aWZ5KGtleSksIGFjdHVhbF9kZWZhdWx0LCBrZXkgPT4gdGhpcy5jYWNoZUdsb2JhbFtrZXldKTtcclxuICAgIH1cclxuXHJcbiAgICBjaGFuZ2VHbG9iYWw8VD4oa2V5OiBzdHJpbmcgfCBTZXR0aW5nc0tleTxUPiwgdmFsdWU/OiBUKXtcclxuICAgICAgICBrZXkgPSBTZXR0aW5ncy5rZXlpZnkoa2V5KTtcclxuXHJcblxyXG4gICAgICAgIGlmKHRoaXMuY2FjaGVHbG9iYWxba2V5LmtleV0gPT0gdmFsdWUpIHJldHVybjtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNhY2hlR2xvYmFsW2tleS5rZXldID0gU3RhdGljU2V0dGluZ3MudHJhbnNmb3JtT3RTKHZhbHVlKTtcclxuXHJcbiAgICAgICAgaWYoU2V0dGluZ3MuVVBEQVRFX0RJUkVDVClcclxuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2F2ZSgpIHtcclxuICAgICAgICB0aGlzLnVwZGF0ZWQgPSBmYWxzZTtcclxuICAgICAgICBsZXQgZ2xvYmFsID0gSlNPTi5zdHJpbmdpZnkodGhpcy5jYWNoZUdsb2JhbCk7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzZXR0aW5ncy5nbG9iYWxcIiwgZ2xvYmFsKTtcclxuICAgICAgICBpZihsb2NhbFN0b3JhZ2Uuc2F2ZSlcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNhdmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNlcnZlclNldHRpbmdzIGV4dGVuZHMgU2V0dGluZ3NCYXNlIHtcclxuICAgIHByaXZhdGUgY2FjaGVTZXJ2ZXIgPSB7fTtcclxuICAgIHByaXZhdGUgX3NlcnZlcl91bmlxdWVfaWQ6IHN0cmluZztcclxuICAgIHByaXZhdGUgX3NlcnZlcl9zYXZlX3dvcmtlcjogTm9kZUpTLlRpbWVyO1xyXG4gICAgcHJpdmF0ZSBfc2VydmVyX3NldHRpbmdzX3VwZGF0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHByaXZhdGUgX2Rlc3Ryb3llZCA9IGZhbHNlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5fc2VydmVyX3NhdmVfd29ya2VyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICAgICAgICBpZih0aGlzLl9zZXJ2ZXJfc2V0dGluZ3NfdXBkYXRlZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZSgpO1xyXG4gICAgICAgIH0sIDUgKiAxMDAwKTtcclxuICAgIH1cclxuXHJcbiAgICBkZXN0cm95KCkge1xyXG4gICAgICAgIHRoaXMuX2Rlc3Ryb3llZCA9IHRydWU7XHJcblxyXG4gICAgICAgIHRoaXMuX3NlcnZlcl91bmlxdWVfaWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgdGhpcy5jYWNoZVNlcnZlciA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9zZXJ2ZXJfc2F2ZV93b3JrZXIpO1xyXG4gICAgICAgIHRoaXMuX3NlcnZlcl9zYXZlX3dvcmtlciA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBzZXJ2ZXI/PFQ+KGtleTogc3RyaW5nIHwgU2V0dGluZ3NLZXk8VD4sIF9kZWZhdWx0PzogVCkgOiBUIHtcclxuICAgICAgICBpZih0aGlzLl9kZXN0cm95ZWQpIHRocm93IFwiZGVzdHJveWVkXCI7XHJcbiAgICAgICAgcmV0dXJuIFN0YXRpY1NldHRpbmdzLnJlc29sdmVLZXkoU2V0dGluZ3Mua2V5aWZ5KGtleSksIF9kZWZhdWx0LCBrZXkgPT4gdGhpcy5jYWNoZVNlcnZlcltrZXldKTtcclxuICAgIH1cclxuXHJcbiAgICBjaGFuZ2VTZXJ2ZXI8VD4oa2V5OiBzdHJpbmcgfCBTZXR0aW5nc0tleTxUPiwgdmFsdWU/OiBUKSB7XHJcbiAgICAgICAgaWYodGhpcy5fZGVzdHJveWVkKSB0aHJvdyBcImRlc3Ryb3llZFwiO1xyXG4gICAgICAgIGtleSA9IFNldHRpbmdzLmtleWlmeShrZXkpO1xyXG5cclxuICAgICAgICBpZih0aGlzLmNhY2hlU2VydmVyW2tleS5rZXldID09IHZhbHVlKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMuX3NlcnZlcl9zZXR0aW5nc191cGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNhY2hlU2VydmVyW2tleS5rZXldID0gU3RhdGljU2V0dGluZ3MudHJhbnNmb3JtT3RTKHZhbHVlKTtcclxuXHJcbiAgICAgICAgaWYoU2V0dGluZ3MuVVBEQVRFX0RJUkVDVClcclxuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0U2VydmVyKHNlcnZlcl91bmlxdWVfaWQ6IHN0cmluZykge1xyXG4gICAgICAgIGlmKHRoaXMuX2Rlc3Ryb3llZCkgdGhyb3cgXCJkZXN0cm95ZWRcIjtcclxuICAgICAgICBpZih0aGlzLl9zZXJ2ZXJfdW5pcXVlX2lkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmNhY2hlU2VydmVyID0ge307XHJcbiAgICAgICAgICAgIHRoaXMuX3NlcnZlcl91bmlxdWVfaWQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3NlcnZlcl91bmlxdWVfaWQgPSBzZXJ2ZXJfdW5pcXVlX2lkO1xyXG5cclxuICAgICAgICBpZih0aGlzLl9zZXJ2ZXJfdW5pcXVlX2lkKSB7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBqc29uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJzZXR0aW5ncy5zZXJ2ZXJfXCIgKyBzZXJ2ZXJfdW5pcXVlX2lkKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVTZXJ2ZXIgPSBKU09OLnBhcnNlKGpzb24pO1xyXG4gICAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoTG9nQ2F0ZWdvcnkuR0VORVJBTCwgdHIoXCJGYWlsZWQgdG8gbG9hZCBzZXJ2ZXIgc2V0dGluZ3MgZm9yIHNlcnZlciAlcyFcXG5Kc29uOiAlc1xcbkVycm9yOiAlb1wiKSwgc2VydmVyX3VuaXF1ZV9pZCwganNvbiwgZXJyb3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmNhY2hlU2VydmVyKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZVNlcnZlciA9IHt9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzYXZlKCkge1xyXG4gICAgICAgIGlmKHRoaXMuX2Rlc3Ryb3llZCkgdGhyb3cgXCJkZXN0cm95ZWRcIjtcclxuICAgICAgICB0aGlzLl9zZXJ2ZXJfc2V0dGluZ3NfdXBkYXRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZih0aGlzLl9zZXJ2ZXJfdW5pcXVlX2lkKSB7XHJcbiAgICAgICAgICAgIGxldCBzZXJ2ZXIgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmNhY2hlU2VydmVyKTtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzZXR0aW5ncy5zZXJ2ZXJfXCIgKyB0aGlzLl9zZXJ2ZXJfdW5pcXVlX2lkLCBzZXJ2ZXIpO1xyXG4gICAgICAgICAgICBpZihsb2NhbFN0b3JhZ2Uuc2F2ZSlcclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zYXZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgbGV0IHNldHRpbmdzOiBTZXR0aW5nczsiLCJpbXBvcnQge0tleUNvZGV9IGZyb20gXCIuLi8uLi9QUFRMaXN0ZW5lclwiO1xyXG5cclxuZXhwb3J0IGVudW0gRWxlbWVudFR5cGUge1xyXG4gICAgSEVBREVSLFxyXG4gICAgQk9EWSxcclxuICAgIEZPT1RFUlxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBCb2R5Q3JlYXRvciA9ICgoKSA9PiBKUXVlcnkgfCBKUXVlcnlbXSB8IHN0cmluZykgfCBzdHJpbmcgfCBKUXVlcnkgfCBKUXVlcnlbXTtcclxuZXhwb3J0IGNvbnN0IE1vZGFsRnVuY3Rpb25zID0ge1xyXG4gICAgZGl2aWZ5OiBmdW5jdGlvbiAodmFsOiBKUXVlcnkpIHtcclxuICAgICAgICBpZih2YWwubGVuZ3RoID4gMSlcclxuICAgICAgICAgICAgcmV0dXJuICQuc3Bhd24oXCJkaXZcIikuYXBwZW5kKHZhbCk7XHJcbiAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgIH0sXHJcblxyXG4gICAganF1ZXJpZWZ5OiBmdW5jdGlvbih2YWw6IEJvZHlDcmVhdG9yLCB0eXBlPzogRWxlbWVudFR5cGUpIDogSlF1ZXJ5W10gfCBKUXVlcnkgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIGlmKHR5cGVvZih2YWwpID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgICAgIHZhbCA9IHZhbCgpO1xyXG5cclxuICAgICAgICBpZih2YWwgaW5zdGFuY2VvZiBqUXVlcnkpXHJcbiAgICAgICAgICAgIHJldHVybiB2YWwgYXMgSlF1ZXJ5O1xyXG5cclxuICAgICAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgICAgICAgaWYodmFsLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB2YWwubWFwKGUgPT4gdGhpcy5qcXVlcmllZnkoZSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgdmFsKXtcclxuICAgICAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxyXG4gICAgICAgICAgICAgICAgaWYodHlwZSA9PSBFbGVtZW50VHlwZS5IRUFERVIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICQuc3Bhd24oXCJkaXZcIikuYWRkQ2xhc3MoXCJtb2RhbC10aXRsZVwiKS50ZXh0KHZhbCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJChcIjxkaXY+XCIgKyB2YWwgKyBcIjwvZGl2PlwiKTtcclxuICAgICAgICAgICAgY2FzZSBcIm9iamVjdFwiOiByZXR1cm4gdmFsIGFzIEpRdWVyeTtcclxuICAgICAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoKFwiSW52YWxpZCB0eXBlICVvXCIpLCB0eXBlb2YgdmFsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICB3YXJwUHJvcGVydGllcyhkYXRhOiBNb2RhbFByb3BlcnRpZXMgfCBhbnkpIDogTW9kYWxQcm9wZXJ0aWVzIHtcclxuICAgICAgICBpZihkYXRhIGluc3RhbmNlb2YgTW9kYWxQcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gbmV3IE1vZGFsUHJvcGVydGllcygpO1xyXG4gICAgICAgICAgICBmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKVxyXG4gICAgICAgICAgICAgICAgcHJvcHNba2V5XSA9IGRhdGFba2V5XTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNb2RhbFByb3BlcnRpZXMge1xyXG4gICAgdGVtcGxhdGU/OiBzdHJpbmc7XHJcbiAgICBoZWFkZXI6IEJvZHlDcmVhdG9yID0gKCkgPT4gXCJIRUFERVJcIjtcclxuICAgIGJvZHk6IEJvZHlDcmVhdG9yID0gKCkgICAgPT4gXCJCT0RZXCI7XHJcbiAgICBmb290ZXI6IEJvZHlDcmVhdG9yID0gKCkgID0+IFwiRk9PVEVSXCI7XHJcblxyXG4gICAgY2xvc2VMaXN0ZW5lcjogKCgpID0+IHZvaWQpIHwgKCgpID0+IHZvaWQpW10gPSAoKSA9PiB7fTtcclxuICAgIHJlZ2lzdGVyQ2xvc2VMaXN0ZW5lcihsaXN0ZW5lcjogKCkgPT4gdm9pZCkgOiB0aGlzIHtcclxuICAgICAgICBpZih0aGlzLmNsb3NlTGlzdGVuZXIpIHtcclxuICAgICAgICAgICAgaWYoJC5pc0FycmF5KHRoaXMuY2xvc2VMaXN0ZW5lcikpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlTGlzdGVuZXIucHVzaChsaXN0ZW5lcik7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2VMaXN0ZW5lciA9IFt0aGlzLmNsb3NlTGlzdGVuZXIsIGxpc3RlbmVyXTtcclxuICAgICAgICB9IGVsc2UgdGhpcy5jbG9zZUxpc3RlbmVyID0gbGlzdGVuZXI7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICB3aWR0aDogbnVtYmVyIHwgc3RyaW5nO1xyXG4gICAgbWluX3dpZHRoPzogbnVtYmVyIHwgc3RyaW5nO1xyXG4gICAgaGVpZ2h0OiBudW1iZXIgfCBzdHJpbmcgPSBcImF1dG9cIjtcclxuXHJcbiAgICBjbG9zZWFibGU6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgIHRyaWdnZXJDbG9zZSgpe1xyXG4gICAgICAgIGlmKCQuaXNBcnJheSh0aGlzLmNsb3NlTGlzdGVuZXIpKVxyXG4gICAgICAgICAgICBmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuY2xvc2VMaXN0ZW5lcilcclxuICAgICAgICAgICAgICAgIGxpc3RlbmVyKCk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aGlzLmNsb3NlTGlzdGVuZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICB0ZW1wbGF0ZV9wcm9wZXJ0aWVzPzogYW55ID0ge307XHJcbiAgICB0cmlnZ2VyX3RhYjogYm9vbGVhbiA9IHRydWU7XHJcbiAgICBmdWxsX3NpemU/OiBib29sZWFuID0gZmFsc2U7XHJcbn1cclxuXHJcbmV4cG9ydCBuYW1lc3BhY2UgbW9kYWwge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGluaXRpYWxpemVfbW9kYWxzKCkge1xyXG4gICAgICAgIHJlZ2lzdGVyX2dsb2JhbF9ldmVudHMoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzY3JvbGxTaXplID0gMTg7XHJcbiAgICBmdW5jdGlvbiBzY3JvbGxfYmFyX2NsaWNrZWQoZXZlbnQpe1xyXG4gICAgICAgIGNvbnN0IHggPSBldmVudC5wYWdlWCxcclxuICAgICAgICAgICAgeSA9IGV2ZW50LnBhZ2VZLFxyXG4gICAgICAgICAgICBlID0gJChldmVudC50YXJnZXQpO1xyXG5cclxuICAgICAgICBpZihlLmhhc1Njcm9sbEJhcihcImhlaWdodFwiKSl7XHJcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IGUub2Zmc2V0KCkudG9wO1xyXG4gICAgICAgICAgICBjb25zdCByaWdodCA9IGUub2Zmc2V0KCkubGVmdCArIGUud2lkdGgoKTtcclxuICAgICAgICAgICAgY29uc3QgYm90dG9tID0gdG9wICtlLmhlaWdodCgpO1xyXG4gICAgICAgICAgICBjb25zdCBsZWZ0ID0gcmlnaHQgLSBzY3JvbGxTaXplO1xyXG5cclxuICAgICAgICAgICAgaWYoKHkgPj0gdG9wICYmIHkgPD0gYm90dG9tKSAmJiAoeCA+PSBsZWZ0ICYmIHggPD0gcmlnaHQpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihlLmhhc1Njcm9sbEJhcihcIndpZHRoXCIpKXtcclxuICAgICAgICAgICAgY29uc3QgYm90dG9tID0gZS5vZmZzZXQoKS50b3AgKyBlLmhlaWdodCgpO1xyXG4gICAgICAgICAgICBjb25zdCB0b3AgPSBib3R0b20gLSBzY3JvbGxTaXplO1xyXG4gICAgICAgICAgICBjb25zdCBsZWZ0ID0gZS5vZmZzZXQoKS5sZWZ0O1xyXG4gICAgICAgICAgICBjb25zdCByaWdodCA9IGxlZnQgKyBlLndpZHRoKCk7XHJcblxyXG4gICAgICAgICAgICBpZigoeSA+PSB0b3AgJiYgeSA8PSBib3R0b20pICYmICh4ID49IGxlZnQgJiYgeCA8PSByaWdodCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZWdpc3Rlcl9nbG9iYWxfZXZlbnRzKCkge1xyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZWRvd24nLCAoZXZlbnQ6IEpRdWVyeS5Nb3VzZURvd25FdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAvKiBwYWdlWCBvciBwYWdlWSBhcmUgdW5kZWZpbmVkIGlmIHRoaXMgaXMgYW4gZXZlbnQgZXhlY3V0ZWQgdmlhIC50cmlnZ2VyKCdjbGljaycpOyAqL1xyXG4gICAgICAgICAgICBpZihfZ2xvYmFsX21vZGFsX2NvdW50ID09IDAgfHwgdHlwZW9mKGV2ZW50LnBhZ2VYKSA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2YoZXZlbnQucGFnZVkpID09PSBcInVuZGVmaW5lZFwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdtb2RhbC1jb250ZW50JykpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoIWVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdtb2RhbCcpKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQgPT0gX2dsb2JhbF9tb2RhbF9sYXN0ICYmIF9nbG9iYWxfbW9kYWxfbGFzdF90aW1lICsgMTAwID4gRGF0ZS5ub3coKSlcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBpZihlbGVtZW50ID09PSBvcmlnaW5hbCAmJiBzY3JvbGxfYmFyX2NsaWNrZWQoZXZlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2dsb2JhbF9tb2RhbF9sYXN0X3RpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgJChlbGVtZW50KS5maW5kKFwiPiAubW9kYWwtZGlhbG9nID4gLm1vZGFsLWNvbnRlbnQgPiAubW9kYWwtaGVhZGVyIC5idXR0b24tbW9kYWwtY2xvc2VcIikudHJpZ2dlcignY2xpY2snKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IHdoaWxlKChlbGVtZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50KSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdrZXl1cCcsIChldmVudDogSlF1ZXJ5LktleVVwRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYoX2dsb2JhbF9tb2RhbF9jb3VudCA9PSAwIHx8IHR5cGVvZihldmVudC50YXJnZXQpID09PSBcInVuZGVmaW5lZFwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgaWYoZXZlbnQua2V5ICE9PSBcIkVzY2FwZVwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmKGVsZW1lbnQubm9kZU5hbWUgPT0gXCJIVE1MSW5wdXRFbGVtZW50XCIgfHwgZWxlbWVudC5ub2RlTmFtZSA9PSBcIkhUTUxTZWxlY3RFbGVtZW50XCIgfHwgZWxlbWVudC5ub2RlTmFtZSA9PSBcIkhUTUxUZXh0QXJlYUVsZW1lbnRcIilcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdtb2RhbC1jb250ZW50JykpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoIWVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdtb2RhbCcpKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQgPT0gX2dsb2JhbF9tb2RhbF9sYXN0ICYmIF9nbG9iYWxfbW9kYWxfbGFzdF90aW1lICsgMTAwID4gRGF0ZS5ub3coKSlcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAkKGVsZW1lbnQpLmZpbmQoXCI+IC5tb2RhbC1kaWFsb2cgPiAubW9kYWwtY29udGVudCA+IC5tb2RhbC1oZWFkZXIgLmJ1dHRvbi1tb2RhbC1jbG9zZVwiKS50cmlnZ2VyKCdjbGljaycpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH0gd2hpbGUoKGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQpKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5tb2RhbC5pbml0aWFsaXplX21vZGFscygpO1xyXG5cclxubGV0IF9nbG9iYWxfbW9kYWxfY291bnQgPSAwO1xyXG5sZXQgX2dsb2JhbF9tb2RhbF9sYXN0OiBIVE1MRWxlbWVudDtcclxubGV0IF9nbG9iYWxfbW9kYWxfbGFzdF90aW1lOiBudW1iZXI7XHJcblxyXG5leHBvcnQgY2xhc3MgTW9kYWwge1xyXG4gICAgcHJpdmF0ZSBfaHRtbFRhZzogSlF1ZXJ5O1xyXG4gICAgcHJvcGVydGllczogTW9kYWxQcm9wZXJ0aWVzO1xyXG4gICAgc2hvd246IGJvb2xlYW47XHJcblxyXG4gICAgb3Blbl9saXN0ZW5lcjogKCgpID0+IGFueSlbXSA9IFtdO1xyXG4gICAgY2xvc2VfbGlzdGVuZXI6ICgoKSA9PiBhbnkpW10gPSBbXTtcclxuICAgIGNsb3NlX2VsZW1lbnRzOiBKUXVlcnk7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJvcHM6IE1vZGFsUHJvcGVydGllcykge1xyXG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BzO1xyXG4gICAgICAgIHRoaXMuc2hvd24gPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgaHRtbFRhZygpIDogSlF1ZXJ5IHtcclxuICAgICAgICBpZighdGhpcy5faHRtbFRhZykgdGhpcy5fY3JlYXRlKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2h0bWxUYWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBfY3JlYXRlKCkge1xyXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IE1vZGFsRnVuY3Rpb25zLmpxdWVyaWVmeSh0aGlzLnByb3BlcnRpZXMuaGVhZGVyLCBFbGVtZW50VHlwZS5IRUFERVIpO1xyXG4gICAgICAgIGNvbnN0IGJvZHkgPSBNb2RhbEZ1bmN0aW9ucy5qcXVlcmllZnkodGhpcy5wcm9wZXJ0aWVzLmJvZHksIEVsZW1lbnRUeXBlLkJPRFkpO1xyXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IE1vZGFsRnVuY3Rpb25zLmpxdWVyaWVmeSh0aGlzLnByb3BlcnRpZXMuZm9vdGVyLCBFbGVtZW50VHlwZS5GT09URVIpO1xyXG5cclxuICAgICAgICAvL0ZJWE1FOiBjYWNoZSB0ZW1wbGF0ZVxyXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gJCh0aGlzLnByb3BlcnRpZXMudGVtcGxhdGUgfHwgXCIjdG1wbF9tb2RhbFwiKTtcclxuXHJcbiAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHtcclxuICAgICAgICAgICAgbW9kYWxfaGVhZGVyOiBoZWFkZXIsXHJcbiAgICAgICAgICAgIG1vZGFsX2JvZHk6IGJvZHksXHJcbiAgICAgICAgICAgIG1vZGFsX2Zvb3RlcjogZm9vdGVyLFxyXG5cclxuICAgICAgICAgICAgY2xvc2VhYmxlOiB0aGlzLnByb3BlcnRpZXMuY2xvc2VhYmxlLFxyXG4gICAgICAgICAgICBmdWxsX3NpemU6IHRoaXMucHJvcGVydGllcy5mdWxsX3NpemVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZih0aGlzLnByb3BlcnRpZXMudGVtcGxhdGVfcHJvcGVydGllcylcclxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihwcm9wZXJ0aWVzLCB0aGlzLnByb3BlcnRpZXMudGVtcGxhdGVfcHJvcGVydGllcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IHRhZyA9IHRlbXBsYXRlLnJlbmRlclRhZyhwcm9wZXJ0aWVzKTtcclxuICAgICAgICBpZih0eXBlb2YodGhpcy5wcm9wZXJ0aWVzLndpZHRoKSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YodGhpcy5wcm9wZXJ0aWVzLm1pbl93aWR0aCkgIT09IFwidW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICAgIHRhZy5maW5kKFwiLm1vZGFsLWNvbnRlbnRcIilcclxuICAgICAgICAgICAgICAgIC5jc3MoXCJtaW4td2lkdGhcIiwgdGhpcy5wcm9wZXJ0aWVzLm1pbl93aWR0aClcclxuICAgICAgICAgICAgICAgIC5jc3MoXCJ3aWR0aFwiLCB0aGlzLnByb3BlcnRpZXMud2lkdGgpO1xyXG4gICAgICAgIGVsc2UgaWYodHlwZW9mKHRoaXMucHJvcGVydGllcy53aWR0aCkgIT09IFwidW5kZWZpbmVkXCIpIC8vTGVnYWN5IHN1cHBvcnRcclxuICAgICAgICAgICAgdGFnLmZpbmQoXCIubW9kYWwtY29udGVudFwiKS5jc3MoXCJtaW4td2lkdGhcIiwgdGhpcy5wcm9wZXJ0aWVzLndpZHRoKTtcclxuICAgICAgICBlbHNlIGlmKHR5cGVvZih0aGlzLnByb3BlcnRpZXMubWluX3dpZHRoKSAhPT0gXCJ1bmRlZmluZWRcIilcclxuICAgICAgICAgICAgdGFnLmZpbmQoXCIubW9kYWwtY29udGVudFwiKS5jc3MoXCJtaW4td2lkdGhcIiwgdGhpcy5wcm9wZXJ0aWVzLm1pbl93aWR0aCk7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2VfZWxlbWVudHMgPSB0YWcuZmluZChcIi5idXR0b24tbW9kYWwtY2xvc2VcIik7XHJcbiAgICAgICAgdGhpcy5jbG9zZV9lbGVtZW50cy50b2dnbGUodGhpcy5wcm9wZXJ0aWVzLmNsb3NlYWJsZSkub24oJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBpZih0aGlzLnByb3BlcnRpZXMuY2xvc2VhYmxlKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX2h0bWxUYWcgPSB0YWc7XHJcblxyXG4gICAgICAgIHRoaXMuX2h0bWxUYWcuZmluZChcImlucHV0XCIpLm9uKCdjaGFuZ2UnLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICQoZXZlbnQudGFyZ2V0KS5wYXJlbnRzKFwiLmZvcm0tZ3JvdXBcIikudG9nZ2xlQ2xhc3MoJ2lzLWZpbGxlZCcsICEhKGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vVE9ETzogQWZ0ZXIgdGhlIGFuaW1hdGlvbiFcclxuICAgICAgICB0aGlzLl9odG1sVGFnLm9uKCdoaWRlLmJzLm1vZGFsJywgZXZlbnQgPT4gIXRoaXMucHJvcGVydGllcy5jbG9zZWFibGUgfHwgdGhpcy5jbG9zZSgpKTtcclxuICAgICAgICB0aGlzLl9odG1sVGFnLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBldmVudCA9PiB0aGlzLl9odG1sVGFnLnJlbW92ZSgpKTtcclxuICAgIH1cclxuXHJcbiAgICBvcGVuKCkge1xyXG4gICAgICAgIGlmKHRoaXMuc2hvd24pXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgX2dsb2JhbF9tb2RhbF9sYXN0X3RpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIF9nbG9iYWxfbW9kYWxfbGFzdCA9IHRoaXMuaHRtbFRhZ1swXTtcclxuXHJcbiAgICAgICAgdGhpcy5zaG93biA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5odG1sVGFnLmFwcGVuZFRvKCQoXCJib2R5XCIpKTtcclxuXHJcbiAgICAgICAgX2dsb2JhbF9tb2RhbF9jb3VudCsrO1xyXG4gICAgICAgIHRoaXMuaHRtbFRhZy5zaG93KCk7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmh0bWxUYWcuYWRkQ2xhc3MoJ3Nob3duJyksIDApO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgZm9yKGNvbnN0IGxpc3RlbmVyIG9mIHRoaXMub3Blbl9saXN0ZW5lcikgbGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5odG1sVGFnLmZpbmQoXCIudGFiXCIpLnRyaWdnZXIoJ3RhYi5yZXNpemUnKTtcclxuICAgICAgICB9LCAzMDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGlmKCF0aGlzLnNob3duKSByZXR1cm47XHJcblxyXG4gICAgICAgIF9nbG9iYWxfbW9kYWxfY291bnQtLTtcclxuICAgICAgICBpZihfZ2xvYmFsX21vZGFsX2xhc3QgPT09IHRoaXMuaHRtbFRhZ1swXSlcclxuICAgICAgICAgICAgX2dsb2JhbF9tb2RhbF9sYXN0ID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICB0aGlzLnNob3duID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5odG1sVGFnLnJlbW92ZUNsYXNzKCdzaG93bicpO1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmh0bWxUYWcucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2h0bWxUYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSwgMzAwKTtcclxuICAgICAgICB0aGlzLnByb3BlcnRpZXMudHJpZ2dlckNsb3NlKCk7XHJcbiAgICAgICAgZm9yKGNvbnN0IGxpc3RlbmVyIG9mIHRoaXMuY2xvc2VfbGlzdGVuZXIpXHJcbiAgICAgICAgICAgIGxpc3RlbmVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0X2Nsb3NlYWJsZShmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYoZmxhZyA9PT0gdGhpcy5wcm9wZXJ0aWVzLmNsb3NlYWJsZSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB0aGlzLnByb3BlcnRpZXMuY2xvc2VhYmxlID0gZmxhZztcclxuICAgICAgICB0aGlzLmNsb3NlX2VsZW1lbnRzLnRvZ2dsZShmbGFnKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1vZGFsKGRhdGE6IE1vZGFsUHJvcGVydGllcyB8IGFueSkgOiBNb2RhbCB7XHJcbiAgICByZXR1cm4gbmV3IE1vZGFsKE1vZGFsRnVuY3Rpb25zLndhcnBQcm9wZXJ0aWVzKGRhdGEpKTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIElucHV0TW9kYWxQcm9wZXJ0aWVzIGV4dGVuZHMgTW9kYWxQcm9wZXJ0aWVzIHtcclxuICAgIG1heExlbmd0aD86IG51bWJlcjtcclxuXHJcbiAgICBmaWVsZF90aXRsZT86IHN0cmluZztcclxuICAgIGZpZWxkX2xhYmVsPzogc3RyaW5nO1xyXG4gICAgZmllbGRfcGxhY2Vob2xkZXI/OiBzdHJpbmc7XHJcblxyXG4gICAgZXJyb3JfbWVzc2FnZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUlucHV0TW9kYWwoaGVhZE1lc3NhZ2U6IEJvZHlDcmVhdG9yLCBxdWVzdGlvbjogQm9keUNyZWF0b3IsIHZhbGlkYXRvcjogKGlucHV0OiBzdHJpbmcpID0+IGJvb2xlYW4sIGNhbGxiYWNrOiAoZmxhZzogYm9vbGVhbiB8IHN0cmluZykgPT4gdm9pZCwgcHJvcHM6IElucHV0TW9kYWxQcm9wZXJ0aWVzIHwgYW55ID0ge30pIDogTW9kYWwge1xyXG4gICAgcHJvcHMgPSBNb2RhbEZ1bmN0aW9ucy53YXJwUHJvcGVydGllcyhwcm9wcyk7XHJcbiAgICBwcm9wcy50ZW1wbGF0ZV9wcm9wZXJ0aWVzIHx8IChwcm9wcy50ZW1wbGF0ZV9wcm9wZXJ0aWVzID0ge30pO1xyXG4gICAgcHJvcHMudGVtcGxhdGVfcHJvcGVydGllcy5maWVsZF90aXRsZSA9IHByb3BzLmZpZWxkX3RpdGxlO1xyXG4gICAgcHJvcHMudGVtcGxhdGVfcHJvcGVydGllcy5maWVsZF9sYWJlbCA9IHByb3BzLmZpZWxkX2xhYmVsO1xyXG4gICAgcHJvcHMudGVtcGxhdGVfcHJvcGVydGllcy5maWVsZF9wbGFjZWhvbGRlciA9IHByb3BzLmZpZWxkX3BsYWNlaG9sZGVyO1xyXG4gICAgcHJvcHMudGVtcGxhdGVfcHJvcGVydGllcy5lcnJvcl9tZXNzYWdlID0gcHJvcHMuZXJyb3JfbWVzc2FnZTtcclxuXHJcbiAgICBwcm9wcy50ZW1wbGF0ZSA9IFwiI3RtcGxfbW9kYWxfaW5wdXRcIjtcclxuXHJcbiAgICBwcm9wcy5oZWFkZXIgPSBoZWFkTWVzc2FnZTtcclxuICAgIHByb3BzLnRlbXBsYXRlX3Byb3BlcnRpZXMucXVlc3Rpb24gPSBNb2RhbEZ1bmN0aW9ucy5qcXVlcmllZnkocXVlc3Rpb24pO1xyXG5cclxuICAgIGNvbnN0IG1vZGFsID0gY3JlYXRlTW9kYWwocHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGlucHV0ID0gbW9kYWwuaHRtbFRhZy5maW5kKFwiLmNvbnRhaW5lci12YWx1ZSBpbnB1dFwiKTtcclxuICAgIGNvbnN0IGJ1dHRvbl9jYW5jZWwgPSBtb2RhbC5odG1sVGFnLmZpbmQoXCIuYnV0dG9uLWNhbmNlbFwiKTtcclxuICAgIGNvbnN0IGJ1dHRvbl9zdWJtaXQgPSBtb2RhbC5odG1sVGFnLmZpbmQoXCIuYnV0dG9uLXN1Ym1pdFwiKTtcclxuXHJcbiAgICBsZXQgc3VibWl0ZWQgPSBmYWxzZTtcclxuICAgIGlucHV0Lm9uKCdrZXl1cCBjaGFuZ2UnLCBldmVudCA9PiB7XHJcbiAgICAgICAgY29uc3Qgc3RyID0gaW5wdXQudmFsKCkgYXMgc3RyaW5nO1xyXG4gICAgICAgIGNvbnN0IHZhbGlkID0gc3RyICE9PSB1bmRlZmluZWQgJiYgdmFsaWRhdG9yKHN0cik7XHJcblxyXG4gICAgICAgIGlucHV0LmF0dHIoXCJwYXR0ZXJuXCIsIHZhbGlkID8gbnVsbCA6IFwiXlthXXsxMDAwfSRcIikudG9nZ2xlQ2xhc3MoXCJpcy1pbnZhbGlkXCIsICF2YWxpZCk7XHJcbiAgICAgICAgYnV0dG9uX3N1Ym1pdC5wcm9wKFwiZGlzYWJsZWRcIiwgIXZhbGlkKTtcclxuICAgIH0pO1xyXG4gICAgaW5wdXQub24oJ2tleWRvd24nLCBldmVudCA9PiB7XHJcbiAgICAgICAgaWYoZXZlbnQua2V5Q29kZSAhPT0gS2V5Q29kZS5LRVlfUkVUVVJOIHx8IGV2ZW50LnNoaWZ0S2V5KVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgaWYoYnV0dG9uX3N1Ym1pdC5wcm9wKFwiZGlzYWJsZWRcIikpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBidXR0b25fc3VibWl0LnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBidXR0b25fc3VibWl0Lm9uKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICBpZighc3VibWl0ZWQpIHtcclxuICAgICAgICAgICAgc3VibWl0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zdCBzdHIgPSBpbnB1dC52YWwoKSBhcyBzdHJpbmc7XHJcbiAgICAgICAgICAgIGlmKHN0ciAhPT0gdW5kZWZpbmVkICYmIHZhbGlkYXRvcihzdHIpKVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soc3RyKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtb2RhbC5jbG9zZSgpO1xyXG4gICAgfSkucHJvcChcImRpc2FibGVkXCIsICF2YWxpZGF0b3IoXCJcIikpOyAvKiBkaXNhYmxlZCBpZiBlbXB0eSBpbnB1dCBpc24ndCBhbGxvd2VkICovXHJcblxyXG4gICAgYnV0dG9uX2NhbmNlbC5vbignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgaWYoIXN1Ym1pdGVkKSB7XHJcbiAgICAgICAgICAgIHN1Ym1pdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtb2RhbC5jbG9zZSgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgbW9kYWwub3Blbl9saXN0ZW5lci5wdXNoKCgpID0+IGlucHV0LmZvY3VzKCkpO1xyXG4gICAgbW9kYWwuY2xvc2VfbGlzdGVuZXIucHVzaCgoKSA9PiBidXR0b25fY2FuY2VsLnRyaWdnZXIoJ2NsaWNrJykpO1xyXG4gICAgcmV0dXJuIG1vZGFsO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXJyb3JNb2RhbChoZWFkZXI6IEJvZHlDcmVhdG9yLCBtZXNzYWdlOiBCb2R5Q3JlYXRvciwgcHJvcHM6IE1vZGFsUHJvcGVydGllcyB8IGFueSA9IHsgZm9vdGVyOiB1bmRlZmluZWQgfSkge1xyXG4gICAgcHJvcHMgPSBNb2RhbEZ1bmN0aW9ucy53YXJwUHJvcGVydGllcyhwcm9wcyk7XHJcbiAgICAocHJvcHMudGVtcGxhdGVfcHJvcGVydGllcyB8fCAocHJvcHMudGVtcGxhdGVfcHJvcGVydGllcyA9IHt9KSkuaGVhZGVyX2NsYXNzID0gXCJtb2RhbC1oZWFkZXItZXJyb3JcIjtcclxuXHJcbiAgICBwcm9wcy5oZWFkZXIgPSBoZWFkZXI7XHJcbiAgICBwcm9wcy5ib2R5ID0gbWVzc2FnZTtcclxuXHJcbiAgICBjb25zdCBtb2RhbCA9IGNyZWF0ZU1vZGFsKHByb3BzKTtcclxuICAgIG1vZGFsLmh0bWxUYWcuZmluZChcIi5tb2RhbC1ib2R5XCIpLmFkZENsYXNzKFwibW9kYWwtZXJyb3JcIik7XHJcbiAgICByZXR1cm4gbW9kYWw7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVJbmZvTW9kYWwoaGVhZGVyOiBCb2R5Q3JlYXRvciwgbWVzc2FnZTogQm9keUNyZWF0b3IsIHByb3BzOiBNb2RhbFByb3BlcnRpZXMgfCBhbnkgPSB7IGZvb3RlcjogdW5kZWZpbmVkIH0pIHtcclxuICAgIHByb3BzID0gTW9kYWxGdW5jdGlvbnMud2FycFByb3BlcnRpZXMocHJvcHMpO1xyXG4gICAgKHByb3BzLnRlbXBsYXRlX3Byb3BlcnRpZXMgfHwgKHByb3BzLnRlbXBsYXRlX3Byb3BlcnRpZXMgPSB7fSkpLmhlYWRlcl9jbGFzcyA9IFwibW9kYWwtaGVhZGVyLWluZm9cIjtcclxuXHJcbiAgICBwcm9wcy5oZWFkZXIgPSBoZWFkZXI7XHJcbiAgICBwcm9wcy5ib2R5ID0gbWVzc2FnZTtcclxuXHJcbiAgICBjb25zdCBtb2RhbCA9IGNyZWF0ZU1vZGFsKHByb3BzKTtcclxuICAgIG1vZGFsLmh0bWxUYWcuZmluZChcIi5tb2RhbC1ib2R5XCIpLmFkZENsYXNzKFwibW9kYWwtaW5mb1wiKTtcclxuICAgIHJldHVybiBtb2RhbDtcclxufVxyXG4iLCJpbXBvcnQge2xvZywgTG9nQ2F0ZWdvcnl9IGZyb20gXCIuLi8uLi9sb2dcIjtcclxuXHJcbmV4cG9ydCBlbnVtIENoYXRUeXBlIHtcclxuICAgIEdFTkVSQUwsXHJcbiAgICBTRVJWRVIsXHJcbiAgICBDSEFOTkVMLFxyXG4gICAgQ0xJRU5UXHJcbn1cclxuXHJcbmRlY2xhcmUgY29uc3QgeGJiY29kZTogYW55O1xyXG5leHBvcnQgbmFtZXNwYWNlIE1lc3NhZ2VIZWxwZXIge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGh0bWxFc2NhcGUobWVzc2FnZTogc3RyaW5nKSA6IHN0cmluZ1tdIHtcclxuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBkaXYuaW5uZXJUZXh0ID0gbWVzc2FnZTtcclxuICAgICAgICBtZXNzYWdlID0gIGRpdi5pbm5lckhUTUw7XHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgvIC9nLCAnJm5ic3A7Jykuc3BsaXQoLzxicj4vKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZm9ybWF0RWxlbWVudChvYmplY3Q6IGFueSwgZXNjYXBlX2h0bWw6IGJvb2xlYW4gPSB0cnVlKSA6IEpRdWVyeVtdIHtcclxuICAgICAgICBpZigkLmlzQXJyYXkob2JqZWN0KSkge1xyXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gW107XHJcbiAgICAgICAgICAgIGZvcihsZXQgZWxlbWVudCBvZiBvYmplY3QpXHJcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCguLi5mb3JtYXRFbGVtZW50KGVsZW1lbnQsIGVzY2FwZV9odG1sKSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSBlbHNlIGlmKHR5cGVvZihvYmplY3QpID09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgaWYob2JqZWN0Lmxlbmd0aCA9PSAwKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZXNjYXBlX2h0bWwgP1xyXG4gICAgICAgICAgICAgICAgaHRtbEVzY2FwZShvYmplY3QpLm1hcCgoZW50cnksIGlkeCwgYXJyYXkpID0+ICQuc3Bhd24oXCJhXCIpLmNzcyhcImRpc3BsYXlcIiwgKGlkeCA9PSAwIHx8IGlkeCArIDEgPT0gYXJyYXkubGVuZ3RoID8gXCJpbmxpbmVcIiA6IFwiXCIpICsgXCJibG9ja1wiKS5odG1sKGVudHJ5ID09IFwiXCIgJiYgaWR4ICE9IDAgPyBcIiZuYnNwO1wiIDogZW50cnkpKSA6XHJcbiAgICAgICAgICAgICAgICBbJC5zcGF3bihcImRpdlwiKS5jc3MoXCJkaXNwbGF5XCIsIFwiaW5saW5lLWJsb2NrXCIpLmh0bWwob2JqZWN0KV07XHJcbiAgICAgICAgfSBlbHNlIGlmKHR5cGVvZihvYmplY3QpID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgIGlmKG9iamVjdCBpbnN0YW5jZW9mICQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW29iamVjdCBhcyBhbnldO1xyXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RWxlbWVudChcIjx1bmtud29uIG9iamVjdD5cIik7XHJcbiAgICAgICAgfSBlbHNlIGlmKHR5cGVvZihvYmplY3QpID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBmb3JtYXRFbGVtZW50KG9iamVjdCgpLCBlc2NhcGVfaHRtbCk7XHJcbiAgICAgICAgZWxzZSBpZih0eXBlb2Yob2JqZWN0KSA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIGZvcm1hdEVsZW1lbnQoXCI8dW5kZWZpbmVkPlwiKTtcclxuICAgICAgICBlbHNlIGlmKHR5cGVvZihvYmplY3QpID09PSBcIm51bWJlclwiKSByZXR1cm4gWyQuc3Bhd24oXCJhXCIpLnRleHQob2JqZWN0KV07XHJcbiAgICAgICAgcmV0dXJuIGZvcm1hdEVsZW1lbnQoXCI8dW5rbm93biBvYmplY3QgdHlwZSBcIiArIHR5cGVvZiBvYmplY3QgKyBcIj5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdE1lc3NhZ2UocGF0dGVybjogc3RyaW5nLCAuLi5vYmplY3RzOiBhbnlbXSkgOiBKUXVlcnlbXSB7XHJcbiAgICAgICAgbGV0IGJlZ2luID0gMCwgZm91bmQgPSAwO1xyXG5cclxuICAgICAgICBsZXQgcmVzdWx0OiBKUXVlcnlbXSA9IFtdO1xyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgZm91bmQgPSBwYXR0ZXJuLmluZGV4T2YoJ3snLCBmb3VuZCk7XHJcbiAgICAgICAgICAgIGlmKGZvdW5kID09IC0xIHx8IHBhdHRlcm4ubGVuZ3RoIDw9IGZvdW5kICsgMSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goLi4uZm9ybWF0RWxlbWVudChwYXR0ZXJuLnN1YnN0cihiZWdpbikpKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihmb3VuZCA+IDAgJiYgcGF0dGVybltmb3VuZCAtIDFdID09ICdcXFxcJykge1xyXG4gICAgICAgICAgICAgICAgLy9UT0RPIHJlbW92ZSB0aGUgZXNjYXBlIVxyXG4gICAgICAgICAgICAgICAgZm91bmQrKztcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXN1bHQucHVzaCguLi5mb3JtYXRFbGVtZW50KHBhdHRlcm4uc3Vic3RyKGJlZ2luLCBmb3VuZCAtIGJlZ2luKSkpOyAvL0FwcGVuZCB0aGUgdGV4dFxyXG5cclxuICAgICAgICAgICAgbGV0IG9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgIGlmKHBhdHRlcm5bZm91bmQgKyAxXSA9PSAnOicpIHtcclxuICAgICAgICAgICAgICAgIG9mZnNldCsrOyAvKiB0aGUgYmVnaW5uaW5nIDogKi9cclxuICAgICAgICAgICAgICAgIHdoaWxlIChwYXR0ZXJuW2ZvdW5kICsgMSArIG9mZnNldF0gIT0gJzonICYmIGZvdW5kICsgMSArIG9mZnNldCA8IHBhdHRlcm4ubGVuZ3RoKSBvZmZzZXQrKztcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhZyA9IHBhdHRlcm4uc3Vic3RyKGZvdW5kICsgMiwgb2Zmc2V0IC0gMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0Kys7IC8qIHRoZSBlbmRpbmcgOiAqL1xyXG4gICAgICAgICAgICAgICAgaWYocGF0dGVybltmb3VuZCArIG9mZnNldCArIDFdICE9ICd9JyAmJiBmb3VuZCArIDEgKyBvZmZzZXQgPCBwYXR0ZXJuLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goJC5zcGF3bih0YWcgYXMgYW55KSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbnVtYmVyO1xyXG4gICAgICAgICAgICAgICAgd2hpbGUgKFwiMDEyMzQ1Njc4OVwiLmluY2x1ZGVzKHBhdHRlcm5bZm91bmQgKyAxICsgb2Zmc2V0XSkpIG9mZnNldCsrO1xyXG4gICAgICAgICAgICAgICAgbnVtYmVyID0gcGFyc2VJbnQob2Zmc2V0ID4gMCA/IHBhdHRlcm4uc3Vic3RyKGZvdW5kICsgMSwgb2Zmc2V0KSA6IFwiMFwiKTtcclxuICAgICAgICAgICAgICAgIGlmKHBhdHRlcm5bZm91bmQgKyBvZmZzZXQgKyAxXSAhPSAnfScpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKG9iamVjdHMubGVuZ3RoIDwgbnVtYmVyKVxyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LkdFTkVSQUwsIHRyKFwiTWVzc2FnZSB0byBmb3JtYXQgY29udGFpbnMgaW52YWxpZCBpbmRleCAoJW8pXCIpLCBudW1iZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKC4uLmZvcm1hdEVsZW1lbnQob2JqZWN0c1tudW1iZXJdKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvdW5kID0gZm91bmQgKyAxICsgb2Zmc2V0O1xyXG4gICAgICAgICAgICBiZWdpbiA9IGZvdW5kICsgMTtcclxuICAgICAgICB9IHdoaWxlKGZvdW5kKyspO1xyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIC8vVE9ETzogUmVtb3ZlIHRoaXMgKG9ubHkgbGVnYWN5KVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGJiY29kZV9jaGF0KG1lc3NhZ2U6IHN0cmluZykgOiBKUXVlcnlbXSB7XHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzLmZvcm1hdHRlci5iYmNvZGUuZm9ybWF0KG1lc3NhZ2UsIHtcclxuICAgICAgICAgICAgaXNfY2hhdF9tZXNzYWdlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IG5hbWVzcGFjZSBuZXR3b3JrIHtcclxuICAgICAgICBleHBvcnQgY29uc3QgS0IgPSAxMDI0O1xyXG4gICAgICAgIGV4cG9ydCBjb25zdCBNQiA9IDEwMjQgKiBLQjtcclxuICAgICAgICBleHBvcnQgY29uc3QgR0IgPSAxMDI0ICogTUI7XHJcbiAgICAgICAgZXhwb3J0IGNvbnN0IFRCID0gMTAyNCAqIEdCO1xyXG5cclxuICAgICAgICBleHBvcnQgZnVuY3Rpb24gZm9ybWF0X2J5dGVzKHZhbHVlOiBudW1iZXIsIG9wdGlvbnM/OiB7XHJcbiAgICAgICAgICAgIHRpbWU/OiBzdHJpbmcsXHJcbiAgICAgICAgICAgIHVuaXQ/OiBzdHJpbmcsXHJcbiAgICAgICAgICAgIGV4YWN0PzogYm9vbGVhblxyXG4gICAgICAgIH0pIDogc3RyaW5nIHtcclxuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgICAgIGlmKHR5cGVvZiBvcHRpb25zLmV4YWN0ICE9PSBcImJvb2xlYW5cIilcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXhhY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZih0eXBlb2Ygb3B0aW9ucy51bml0ICE9PSBcInN0cmluZ1wiKVxyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy51bml0ID0gXCJCeXRlc1wiO1xyXG5cclxuICAgICAgICAgICAgbGV0IHBvaW50cyA9IHZhbHVlLnRvRml4ZWQoMCkucmVwbGFjZSgvKFxcZCkoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCAnJDEsJyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgdiwgdW5pdDtcclxuICAgICAgICAgICAgaWYodmFsdWUgPiAyICogVEIpIHtcclxuICAgICAgICAgICAgICAgIHVuaXQgPSBcIlRCXCI7XHJcbiAgICAgICAgICAgICAgICB2ID0gdmFsdWUgLyBUQjtcclxuICAgICAgICAgICAgfSBlbHNlIGlmKHZhbHVlID4gR0IpIHtcclxuICAgICAgICAgICAgICAgIHVuaXQgPSBcIkdCXCI7XHJcbiAgICAgICAgICAgICAgICB2ID0gdmFsdWUgLyBHQjtcclxuICAgICAgICAgICAgfSBlbHNlIGlmKHZhbHVlID4gTUIpIHtcclxuICAgICAgICAgICAgICAgIHVuaXQgPSBcIk1CXCI7XHJcbiAgICAgICAgICAgICAgICB2ID0gdmFsdWUgLyBNQjtcclxuICAgICAgICAgICAgfSBlbHNlIGlmKHZhbHVlID4gS0IpIHtcclxuICAgICAgICAgICAgICAgIHVuaXQgPSBcIktCXCI7XHJcbiAgICAgICAgICAgICAgICB2ID0gdmFsdWUgLyBLQjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHVuaXQgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgdiA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gXCJcIjtcclxuICAgICAgICAgICAgaWYob3B0aW9ucy5leGFjdCB8fCAhdW5pdCkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHBvaW50cztcclxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMudW5pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiBcIiArIG9wdGlvbnMudW5pdDtcclxuICAgICAgICAgICAgICAgICAgICBpZihvcHRpb25zLnRpbWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIi9cIiArIG9wdGlvbnMudGltZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih1bml0KSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gKHJlc3VsdCA/IFwiIC8gXCIgOiBcIlwiKSArIHYudG9GaXhlZCgyKSArIFwiIFwiICsgdW5pdDtcclxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMudGltZSlcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIvXCIgKyBvcHRpb25zLnRpbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNvbnN0IEsgPSAxMDAwO1xyXG4gICAgZXhwb3J0IGNvbnN0IE0gPSAxMDAwICogSztcclxuICAgIGV4cG9ydCBjb25zdCBHID0gMTAwMCAqIE07XHJcbiAgICBleHBvcnQgY29uc3QgVCA9IDEwMDAgKiBHO1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdF9udW1iZXIodmFsdWU6IG51bWJlciwgb3B0aW9ucz86IHtcclxuICAgICAgICB0aW1lPzogc3RyaW5nLFxyXG4gICAgICAgIHVuaXQ/OiBzdHJpbmdcclxuICAgIH0pIHtcclxuICAgICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zIHx8IHt9LCB7fSk7XHJcblxyXG4gICAgICAgIGxldCBwb2ludHMgPSB2YWx1ZS50b0ZpeGVkKDApLnJlcGxhY2UoLyhcXGQpKD89KFxcZHszfSkrKD8hXFxkKSkvZywgJyQxLCcpO1xyXG5cclxuICAgICAgICBsZXQgdiwgdW5pdDtcclxuICAgICAgICBpZih2YWx1ZSA+IDIgKiBUKSB7XHJcbiAgICAgICAgICAgIHVuaXQgPSBcIlRcIjtcclxuICAgICAgICAgICAgdiA9IHZhbHVlIC8gVDtcclxuICAgICAgICB9IGVsc2UgaWYodmFsdWUgPiBHKSB7XHJcbiAgICAgICAgICAgIHVuaXQgPSBcIkdcIjtcclxuICAgICAgICAgICAgdiA9IHZhbHVlIC8gRztcclxuICAgICAgICB9IGVsc2UgaWYodmFsdWUgPiBNKSB7XHJcbiAgICAgICAgICAgIHVuaXQgPSBcIk1cIjtcclxuICAgICAgICAgICAgdiA9IHZhbHVlIC8gTTtcclxuICAgICAgICB9IGVsc2UgaWYodmFsdWUgPiBLKSB7XHJcbiAgICAgICAgICAgIHVuaXQgPSBcIktcIjtcclxuICAgICAgICAgICAgdiA9IHZhbHVlIC8gSztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB1bml0ID0gXCJcIjtcclxuICAgICAgICAgICAgdiA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZih1bml0ICYmIG9wdGlvbnMudGltZSlcclxuICAgICAgICAgICAgdW5pdCA9IHVuaXQgKyBcIi9cIiArIG9wdGlvbnMudGltZTtcclxuICAgICAgICByZXR1cm4gcG9pbnRzICsgXCIgXCIgKyAob3B0aW9ucy51bml0IHx8IFwiXCIpICsgKHVuaXQgPyAoXCIgLyBcIiArIHYudG9GaXhlZCgyKSArIFwiIFwiICsgdW5pdCkgOiBcIlwiKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY29uc3QgVElNRV9TRUNPTkQgPSAxMDAwO1xyXG4gICAgZXhwb3J0IGNvbnN0IFRJTUVfTUlOVVRFID0gNjAgKiBUSU1FX1NFQ09ORDtcclxuICAgIGV4cG9ydCBjb25zdCBUSU1FX0hPVVIgPSA2MCAqIFRJTUVfTUlOVVRFO1xyXG4gICAgZXhwb3J0IGNvbnN0IFRJTUVfREFZID0gMjQgKiBUSU1FX0hPVVI7XHJcbiAgICBleHBvcnQgY29uc3QgVElNRV9XRUVLID0gNyAqIFRJTUVfREFZO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBmb3JtYXRfdGltZSh0aW1lOiBudW1iZXIsIGRlZmF1bHRfdmFsdWU6IHN0cmluZykge1xyXG4gICAgICAgIGxldCByZXN1bHQgPSBcIlwiO1xyXG4gICAgICAgIGlmKHRpbWUgPiBUSU1FX1dFRUspIHtcclxuICAgICAgICAgICAgY29uc3QgYW1vdW50ID0gTWF0aC5mbG9vcih0aW1lIC8gVElNRV9XRUVLKTtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IFwiIFwiICsgYW1vdW50ICsgXCIgXCIgKyAoYW1vdW50ID4gMSA/IHRyKFwiV2Vla3NcIikgOiB0cihcIldlZWtcIikpO1xyXG4gICAgICAgICAgICB0aW1lIC09IGFtb3VudCAqIFRJTUVfV0VFSztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHRpbWUgPiBUSU1FX0RBWSkge1xyXG4gICAgICAgICAgICBjb25zdCBhbW91bnQgPSBNYXRoLmZsb29yKHRpbWUgLyBUSU1FX0RBWSk7XHJcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIiBcIiArIGFtb3VudCArIFwiIFwiICsgKGFtb3VudCA+IDEgPyB0cihcIkRheXNcIikgOiB0cihcIkRheVwiKSk7XHJcbiAgICAgICAgICAgIHRpbWUgLT0gYW1vdW50ICogVElNRV9EQVk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aW1lID4gVElNRV9IT1VSKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFtb3VudCA9IE1hdGguZmxvb3IodGltZSAvIFRJTUVfSE9VUik7XHJcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIiBcIiArIGFtb3VudCArIFwiIFwiICsgKGFtb3VudCA+IDEgPyB0cihcIkhvdXJzXCIpIDogdHIoXCJIb3VyXCIpKTtcclxuICAgICAgICAgICAgdGltZSAtPSBhbW91bnQgKiBUSU1FX0hPVVI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aW1lID4gVElNRV9NSU5VVEUpIHtcclxuICAgICAgICAgICAgY29uc3QgYW1vdW50ID0gTWF0aC5mbG9vcih0aW1lIC8gVElNRV9NSU5VVEUpO1xyXG4gICAgICAgICAgICByZXN1bHQgKz0gXCIgXCIgKyBhbW91bnQgKyBcIiBcIiArIChhbW91bnQgPiAxID8gdHIoXCJNaW51dGVzXCIpIDogdHIoXCJNaW51dGVcIikpO1xyXG4gICAgICAgICAgICB0aW1lIC09IGFtb3VudCAqIFRJTUVfTUlOVVRFO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodGltZSA+IFRJTUVfU0VDT05EKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFtb3VudCA9IE1hdGguZmxvb3IodGltZSAvIFRJTUVfU0VDT05EKTtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IFwiIFwiICsgYW1vdW50ICsgXCIgXCIgKyAoYW1vdW50ID4gMSA/IHRyKFwiU2Vjb25kc1wiKSA6IHRyKFwiU2Vjb25kXCIpKTtcclxuICAgICAgICAgICAgdGltZSAtPSBhbW91bnQgKiBUSU1FX1NFQ09ORDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQubGVuZ3RoID4gMCA/IHJlc3VsdC5zdWJzdHJpbmcoMSkgOiBkZWZhdWx0X3ZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBfaWNvbl9zaXplX3N0eWxlOiBKUXVlcnk8SFRNTFN0eWxlRWxlbWVudD47XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0X2ljb25fc2l6ZShzaXplOiBzdHJpbmcpIHtcclxuICAgICAgICBpZighX2ljb25fc2l6ZV9zdHlsZSlcclxuICAgICAgICAgICAgX2ljb25fc2l6ZV9zdHlsZSA9ICQuc3Bhd24oXCJzdHlsZVwiKS5hcHBlbmRUbygkKFwiI3N0eWxlXCIpKTtcclxuXHJcbiAgICAgICAgX2ljb25fc2l6ZV9zdHlsZS50ZXh0KFwiXFxuXCIgK1xyXG4gICAgICAgICAgICBcIi5tZXNzYWdlID4gLmVtb2ppIHtcXG5cIiArXHJcbiAgICAgICAgICAgIFwiICBoZWlnaHQ6IFwiICsgc2l6ZSArIFwiIWltcG9ydGFudDtcXG5cIiArXHJcbiAgICAgICAgICAgIFwiICB3aWR0aDogXCIgKyBzaXplICsgXCIhaW1wb3J0YW50O1xcblwiICtcclxuICAgICAgICAgICAgXCJ9XFxuXCJcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5KQVZBU0NSSVBUX0lOSVRJQUxJWklORywge1xyXG4gICAgICAgIG5hbWU6IFwiaWNvbiBzaXplIGluaXRcIixcclxuICAgICAgICBmdW5jdGlvbjogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBNZXNzYWdlSGVscGVyLnNldF9pY29uX3NpemUoKHNldHRpbmdzLnN0YXRpY19nbG9iYWwoU2V0dGluZ3MuS0VZX0lDT05fU0laRSkgLyAxMDApLnRvRml4ZWQoMikgKyBcImVtXCIpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcHJpb3JpdHk6IDEwXHJcbiAgICB9KTtcclxufSIsIi8vRklYTUU6IE1vdmUgdGhpcyBzaGl0IG91dCBvZiB0aGlzIGZpbGUhXHJcbmV4cG9ydCBuYW1lc3BhY2UgY29ubmVjdGlvbl9sb2cge1xyXG4gICAgLy9UT0RPOiBTYXZlIHBhc3N3b3JkIGRhdGFcclxuICAgIGV4cG9ydCB0eXBlIENvbm5lY3Rpb25EYXRhID0ge1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICBpY29uX2lkOiBudW1iZXI7XHJcbiAgICAgICAgY291bnRyeTogc3RyaW5nO1xyXG4gICAgICAgIGNsaWVudHNfb25saW5lOiBudW1iZXI7XHJcbiAgICAgICAgY2xpZW50c190b3RhbDogbnVtYmVyO1xyXG5cclxuICAgICAgICBmbGFnX3Bhc3N3b3JkOiBib29sZWFuO1xyXG4gICAgICAgIHBhc3N3b3JkX2hhc2g6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgdHlwZSBDb25uZWN0aW9uRW50cnkgPSBDb25uZWN0aW9uRGF0YSAmIHtcclxuICAgICAgICBhZGRyZXNzOiB7IGhvc3RuYW1lOiBzdHJpbmc7IHBvcnQ6IG51bWJlciB9LFxyXG4gICAgICAgIHRvdGFsX2Nvbm5lY3Rpb246IG51bWJlcjtcclxuXHJcbiAgICAgICAgZmlyc3RfdGltZXN0YW1wOiBudW1iZXI7XHJcbiAgICAgICAgbGFzdF90aW1lc3RhbXA6IG51bWJlcjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgX2hpc3Rvcnk6IENvbm5lY3Rpb25FbnRyeVtdID0gW107XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbG9nX2Nvbm5lY3QoYWRkcmVzczogeyBob3N0bmFtZTogc3RyaW5nOyBwb3J0OiBudW1iZXIgfSkge1xyXG4gICAgICAgIGxldCBlbnRyeSA9IF9oaXN0b3J5LmZpbmQoZSA9PiBlLmFkZHJlc3MuaG9zdG5hbWUudG9Mb3dlckNhc2UoKSA9PSBhZGRyZXNzLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCkgJiYgZS5hZGRyZXNzLnBvcnQgPT0gYWRkcmVzcy5wb3J0KTtcclxuICAgICAgICBpZighZW50cnkpIHtcclxuICAgICAgICAgICAgX2hpc3RvcnkucHVzaChlbnRyeSA9IHtcclxuICAgICAgICAgICAgICAgIGxhc3RfdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgZmlyc3RfdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgYWRkcmVzczogYWRkcmVzcyxcclxuICAgICAgICAgICAgICAgIGNsaWVudHNfb25saW5lOiAwLFxyXG4gICAgICAgICAgICAgICAgY2xpZW50c190b3RhbDogMCxcclxuICAgICAgICAgICAgICAgIGNvdW50cnk6ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdVbmtub3duJyxcclxuICAgICAgICAgICAgICAgIGljb25faWQ6IDAsXHJcbiAgICAgICAgICAgICAgICB0b3RhbF9jb25uZWN0aW9uOiAwLFxyXG5cclxuICAgICAgICAgICAgICAgIGZsYWdfcGFzc3dvcmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRfaGFzaDogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRyeS5sYXN0X3RpbWVzdGFtcCA9IERhdGUubm93KCk7XHJcbiAgICAgICAgZW50cnkudG90YWxfY29ubmVjdGlvbisrO1xyXG4gICAgICAgIF9zYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZV9hZGRyZXNzX2luZm8oYWRkcmVzczogeyBob3N0bmFtZTogc3RyaW5nOyBwb3J0OiBudW1iZXIgfSwgZGF0YTogQ29ubmVjdGlvbkRhdGEpIHtcclxuICAgICAgICBfaGlzdG9yeS5maWx0ZXIoZSA9PiBlLmFkZHJlc3MuaG9zdG5hbWUudG9Mb3dlckNhc2UoKSA9PSBhZGRyZXNzLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCkgJiYgZS5hZGRyZXNzLnBvcnQgPT0gYWRkcmVzcy5wb3J0KS5mb3JFYWNoKGUgPT4ge1xyXG4gICAgICAgICAgICBmb3IoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YVtrZXldKSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVba2V5XSA9IGRhdGFba2V5XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIF9zYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZV9hZGRyZXNzX3Bhc3N3b3JkKGFkZHJlc3M6IHsgaG9zdG5hbWU6IHN0cmluZzsgcG9ydDogbnVtYmVyIH0sIHBhc3N3b3JkX2hhc2g6IHN0cmluZykge1xyXG4gICAgICAgIF9oaXN0b3J5LmZpbHRlcihlID0+IGUuYWRkcmVzcy5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpID09IGFkZHJlc3MuaG9zdG5hbWUudG9Mb3dlckNhc2UoKSAmJiBlLmFkZHJlc3MucG9ydCA9PSBhZGRyZXNzLnBvcnQpLmZvckVhY2goZSA9PiB7XHJcbiAgICAgICAgICAgIGUucGFzc3dvcmRfaGFzaCA9IHBhc3N3b3JkX2hhc2g7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgX3NhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBfc2F2ZSgpIHtcclxuICAgICAgICBzZXR0aW5ncy5jaGFuZ2VHbG9iYWwoU2V0dGluZ3MuS0VZX0NPTk5FQ1RfSElTVE9SWSwgSlNPTi5zdHJpbmdpZnkoX2hpc3RvcnkpKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gaGlzdG9yeSgpIDogQ29ubmVjdGlvbkVudHJ5W10ge1xyXG4gICAgICAgIHJldHVybiBfaGlzdG9yeS5zb3J0KChhLCBiKSA9PiBiLmxhc3RfdGltZXN0YW1wIC0gYS5sYXN0X3RpbWVzdGFtcCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGRlbGV0ZV9lbnRyeShhZGRyZXNzOiB7IGhvc3RuYW1lOiBzdHJpbmc7IHBvcnQ6IG51bWJlciB9KSB7XHJcbiAgICAgICAgX2hpc3RvcnkgPSBfaGlzdG9yeS5maWx0ZXIoZSA9PiAhKGUuYWRkcmVzcy5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpID09IGFkZHJlc3MuaG9zdG5hbWUudG9Mb3dlckNhc2UoKSAmJiBlLmFkZHJlc3MucG9ydCA9PSBhZGRyZXNzLnBvcnQpKTtcclxuICAgICAgICBfc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRlci5yZWdpc3Rlcl90YXNrKGxvYWRlci5TdGFnZS5KQVZBU0NSSVBUX0lOSVRJQUxJWklORywge1xyXG4gICAgICAgIG5hbWU6ICdjb25uZWN0aW9uIGhpc3RvcnkgbG9hZCcsXHJcbiAgICAgICAgcHJpb3JpdHk6IDEsXHJcbiAgICAgICAgZnVuY3Rpb246IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgX2hpc3RvcnkgPSBbXTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIF9oaXN0b3J5ID0gSlNPTi5wYXJzZShzZXR0aW5ncy5nbG9iYWwoU2V0dGluZ3MuS0VZX0NPTk5FQ1RfSElTVE9SWSwgXCJbXVwiKSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZy53YXJuKExvZ0NhdGVnb3J5LkNMSUVOVCwgdHIoXCJGYWlsZWQgdG8gbG9hZCBjb25uZWN0aW9uIGhpc3Rvcnk6IHt9XCIpLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IG5hbWVzcGFjZSBNb2RhbHMge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQ29ubmVjdE1vZGFsKG9wdGlvbnM6IHtcclxuICAgICAgICBkZWZhdWx0X2Nvbm5lY3RfbmV3X3RhYj86IGJvb2xlYW4gLyogZGVmYXVsdCBmYWxzZSAqL1xyXG4gICAgfSwgZGVmYXVsdEhvc3Q6IHsgdXJsOiBzdHJpbmcsIGVuZm9yY2U6IGJvb2xlYW59ID0geyB1cmw6IFwidHMuVGVhU3BlYWsuZGVcIiwgZW5mb3JjZTogZmFsc2V9LCBjb25uZWN0X3Byb2ZpbGU/OiB7IHByb2ZpbGU6IHByb2ZpbGVzLkNvbm5lY3Rpb25Qcm9maWxlLCBlbmZvcmNlOiBib29sZWFufSkge1xyXG4gICAgICAgIGxldCBzZWxlY3RlZF9wcm9maWxlOiBwcm9maWxlcy5Db25uZWN0aW9uUHJvZmlsZTtcclxuXHJcbiAgICAgICAgY29uc3QgcmFuZG9tX2lkID0gKCgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYXJyYXkgPSBuZXcgVWludDMyQXJyYXkoMTApO1xyXG4gICAgICAgICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhhcnJheSk7XHJcbiAgICAgICAgICAgIHJldHVybiBhcnJheS5qb2luKFwiXCIpO1xyXG4gICAgICAgIH0pKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IG1vZGFsID0gY3JlYXRlTW9kYWwoe1xyXG4gICAgICAgICAgICBoZWFkZXI6IHRyKFwiQ29ubmVjdCB0byBhIHNlcnZlclwiKSxcclxuICAgICAgICAgICAgYm9keTogJChcIiN0bXBsX2Nvbm5lY3RcIikucmVuZGVyVGFnKHtcclxuICAgICAgICAgICAgICAgIGNsaWVudDogbmF0aXZlX2NsaWVudCxcclxuICAgICAgICAgICAgICAgIGZvcnVtX3BhdGg6IHNldHRpbmdzLnN0YXRpYyhcImZvcnVtX3BhdGhcIiksXHJcbiAgICAgICAgICAgICAgICBwYXNzd29yZF9pZDogcmFuZG9tX2lkLFxyXG4gICAgICAgICAgICAgICAgbXVsdGlfdGFiOiAhc2V0dGluZ3Muc3RhdGljX2dsb2JhbChTZXR0aW5ncy5LRVlfRElTQUJMRV9NVUxUSV9TRVNTSU9OKSxcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRfY29ubmVjdF9uZXdfdGFiOiB0eXBlb2Yob3B0aW9ucy5kZWZhdWx0X2Nvbm5lY3RfbmV3X3RhYikgPT09IFwiYm9vbGVhblwiICYmIG9wdGlvbnMuZGVmYXVsdF9jb25uZWN0X25ld190YWJcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGZvb3RlcjogKCkgPT4gdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBtaW5fd2lkdGg6IFwiMjhlbVwiXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG1vZGFsLmh0bWxUYWcuZmluZChcIi5tb2RhbC1ib2R5XCIpLmFkZENsYXNzKFwibW9kYWwtY29ubmVjdFwiKTtcclxuXHJcbiAgICAgICAgLyogc2VydmVyIGxpc3QgdG9nZ2xlICovXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBjb250YWluZXJfbGFzdF9zZXJ2ZXJzID0gbW9kYWwuaHRtbFRhZy5maW5kKFwiLmNvbnRhaW5lci1sYXN0LXNlcnZlcnNcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1dHRvbiA9IG1vZGFsLmh0bWxUYWcuZmluZChcIi5idXR0b24tdG9nZ2xlLWxhc3Qtc2VydmVyc1wiKTtcclxuICAgICAgICAgICAgY29uc3Qgc2V0X3Nob3cgPSBzaG93biA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJfbGFzdF9zZXJ2ZXJzLnRvZ2dsZUNsYXNzKCdzaG93bicsIHNob3duKTtcclxuICAgICAgICAgICAgICAgIGJ1dHRvbi5maW5kKFwiLmFycm93XCIpLnRvZ2dsZUNsYXNzKCdkb3duJywgc2hvd24pLnRvZ2dsZUNsYXNzKCd1cCcsICFzaG93bik7XHJcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5jaGFuZ2VHbG9iYWwoXCJjb25uZWN0X3Nob3dfbGFzdF9zZXJ2ZXJzXCIsIHNob3duKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgYnV0dG9uLm9uKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIHNldF9zaG93KCFjb250YWluZXJfbGFzdF9zZXJ2ZXJzLmhhc0NsYXNzKFwic2hvd25cIikpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc2V0X3Nob3coc2V0dGluZ3Muc3RhdGljX2dsb2JhbChcImNvbm5lY3Rfc2hvd19sYXN0X3NlcnZlcnNcIiwgZmFsc2UpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFwcGx5ID0gKGhlYWRlciwgYm9keSwgZm9vdGVyKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lcl9sYXN0X3NlcnZlcl9ib2R5ID0gbW9kYWwuaHRtbFRhZy5maW5kKFwiLmNvbnRhaW5lci1sYXN0LXNlcnZlcnMgLnRhYmxlIC5ib2R5XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250YWluZXJfZW1wdHkgPSBjb250YWluZXJfbGFzdF9zZXJ2ZXJfYm9keS5maW5kKFwiLmJvZHktZW1wdHlcIik7XHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50X2Nvbm5lY3RfZGF0YTogY29ubmVjdGlvbl9sb2cuQ29ubmVjdGlvbkVudHJ5O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYnV0dG9uX2Nvbm5lY3QgPSBmb290ZXIuZmluZChcIi5idXR0b24tY29ubmVjdFwiKTtcclxuICAgICAgICAgICAgY29uc3QgYnV0dG9uX2Nvbm5lY3RfdGFiID0gZm9vdGVyLmZpbmQoXCIuYnV0dG9uLWNvbm5lY3QtbmV3LXRhYlwiKTtcclxuICAgICAgICAgICAgY29uc3QgYnV0dG9uX21hbmFnZSA9IGJvZHkuZmluZChcIi5idXR0b24tbWFuYWdlLXByb2ZpbGVzXCIpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaW5wdXRfcHJvZmlsZSA9IGJvZHkuZmluZChcIi5jb250YWluZXItc2VsZWN0LXByb2ZpbGUgc2VsZWN0XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBpbnB1dF9hZGRyZXNzID0gYm9keS5maW5kKFwiLmNvbnRhaW5lci1hZGRyZXNzIGlucHV0XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBpbnB1dF9uaWNrbmFtZSA9IGJvZHkuZmluZChcIi5jb250YWluZXItbmlja25hbWUgaW5wdXRcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGlucHV0X3Bhc3N3b3JkID0gYm9keS5maW5kKFwiLmNvbnRhaW5lci1wYXNzd29yZCBpbnB1dFwiKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB1cGRhdGVGaWVsZHMgPSAocmVzZXRfY3VycmVudF9kYXRhOiBib29sZWFuKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZihyZXNldF9jdXJyZW50X2RhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50X2Nvbm5lY3RfZGF0YSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJfbGFzdF9zZXJ2ZXJfYm9keS5maW5kKFwiLnNlbGVjdGVkXCIpLnJlbW92ZUNsYXNzKFwic2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGFkZHJlc3MgPSBpbnB1dF9hZGRyZXNzLnZhbCgpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5jaGFuZ2VHbG9iYWwoU2V0dGluZ3MuS0VZX0NPTk5FQ1RfQUREUkVTUywgYWRkcmVzcyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZmxhZ19hZGRyZXNzID0gISFhZGRyZXNzLm1hdGNoKFJlZ2V4LklQX1Y0KSB8fCAhIWFkZHJlc3MubWF0Y2goUmVnZXguSVBfVjYpIHx8ICEhYWRkcmVzcy5tYXRjaChSZWdleC5ET01BSU4pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBuaWNrbmFtZSA9IGlucHV0X25pY2tuYW1lLnZhbCgpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICBpZihuaWNrbmFtZSlcclxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5jaGFuZ2VHbG9iYWwoU2V0dGluZ3MuS0VZX0NPTk5FQ1RfVVNFUk5BTUUsIG5pY2tuYW1lKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBuaWNrbmFtZSA9IGlucHV0X25pY2tuYW1lLmF0dHIoXCJwbGFjZWhvbGRlclwiKSB8fCBcIlwiO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZsYWdfbmlja25hbWUgPSBuaWNrbmFtZS5sZW5ndGggPj0gMyAmJiBuaWNrbmFtZS5sZW5ndGggPD0gMzI7XHJcblxyXG4gICAgICAgICAgICAgICAgaW5wdXRfYWRkcmVzcy5hdHRyKCdwYXR0ZXJuJywgZmxhZ19hZGRyZXNzID8gbnVsbCA6ICdeW2FdezEwMDB9JCcpLnRvZ2dsZUNsYXNzKCdpcy1pbnZhbGlkJywgIWZsYWdfYWRkcmVzcyk7XHJcbiAgICAgICAgICAgICAgICBpbnB1dF9uaWNrbmFtZS5hdHRyKCdwYXR0ZXJuJywgZmxhZ19uaWNrbmFtZSA/IG51bGwgOiAnXlthXXsxMDAwfSQnKS50b2dnbGVDbGFzcygnaXMtaW52YWxpZCcsICFmbGFnX25pY2tuYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBmbGFnX2Rpc2FibGVkID0gIWZsYWdfbmlja25hbWUgfHwgIWZsYWdfYWRkcmVzcyB8fCAhc2VsZWN0ZWRfcHJvZmlsZSB8fCAhc2VsZWN0ZWRfcHJvZmlsZS52YWxpZCgpO1xyXG4gICAgICAgICAgICAgICAgYnV0dG9uX2Nvbm5lY3QucHJvcChcImRpc2FibGVkXCIsIGZsYWdfZGlzYWJsZWQpO1xyXG4gICAgICAgICAgICAgICAgYnV0dG9uX2Nvbm5lY3RfdGFiLnByb3AoXCJkaXNhYmxlZFwiLCBmbGFnX2Rpc2FibGVkKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGlucHV0X2FkZHJlc3MudmFsKGRlZmF1bHRIb3N0LmVuZm9yY2UgPyBkZWZhdWx0SG9zdC51cmwgOiBzZXR0aW5ncy5zdGF0aWNfZ2xvYmFsKFNldHRpbmdzLktFWV9DT05ORUNUX0FERFJFU1MsIGRlZmF1bHRIb3N0LnVybCkpO1xyXG4gICAgICAgICAgICBpbnB1dF9hZGRyZXNzXHJcbiAgICAgICAgICAgICAgICAub24oXCJrZXl1cFwiLCAoKSA9PiB1cGRhdGVGaWVsZHModHJ1ZSkpXHJcbiAgICAgICAgICAgICAgICAub24oJ2tleWRvd24nLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZXZlbnQua2V5Q29kZSA9PSBLZXlDb2RlLktFWV9FTlRFUiAmJiAhZXZlbnQuc2hpZnRLZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbl9jb25uZWN0LnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgYnV0dG9uX21hbmFnZS5vbignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IE1vZGFscy5zcGF3blNldHRpbmdzTW9kYWwoXCJpZGVudGl0eS1wcm9maWxlc1wiKTtcclxuICAgICAgICAgICAgICAgIG1vZGFsLmNsb3NlX2xpc3RlbmVyLnB1c2goKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X3Byb2ZpbGUudHJpZ2dlcignY2hhbmdlJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8qIENvbm5lY3QgUHJvZmlsZXMgKi9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZm9yKGNvbnN0IHByb2ZpbGUgb2YgcHJvZmlsZXMucHJvZmlsZXMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X3Byb2ZpbGUuYXBwZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnNwYXduKFwib3B0aW9uXCIpLnRleHQocHJvZmlsZS5wcm9maWxlX25hbWUpLnZhbChwcm9maWxlLmlkKVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW5wdXRfcHJvZmlsZS5vbignY2hhbmdlJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkX3Byb2ZpbGUgPSBwcm9maWxlcy5maW5kX3Byb2ZpbGUoaW5wdXRfcHJvZmlsZS52YWwoKSBhcyBzdHJpbmcpIHx8IHByb2ZpbGVzLmRlZmF1bHRfcHJvZmlsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuY2hhbmdlR2xvYmFsKFNldHRpbmdzLktFWV9DT05ORUNUX1VTRVJOQU1FLCB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9uaWNrbmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3BsYWNlaG9sZGVyJywgc2VsZWN0ZWRfcHJvZmlsZS5jb25uZWN0X3VzZXJuYW1lKCkgfHwgXCJBbm90aGVyIFRlYVNwZWFrIHVzZXJcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC52YWwoXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5jaGFuZ2VHbG9iYWwoU2V0dGluZ3MuS0VZX0NPTk5FQ1RfUFJPRklMRSwgc2VsZWN0ZWRfcHJvZmlsZS5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRfcHJvZmlsZS50b2dnbGVDbGFzcyhcImlzLWludmFsaWRcIiwgIXNlbGVjdGVkX3Byb2ZpbGUgfHwgIXNlbGVjdGVkX3Byb2ZpbGUudmFsaWQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmllbGRzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpbnB1dF9wcm9maWxlLnZhbChjb25uZWN0X3Byb2ZpbGUgJiYgY29ubmVjdF9wcm9maWxlLnByb2ZpbGUgP1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3RfcHJvZmlsZS5wcm9maWxlLmlkIDpcclxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5zdGF0aWNfZ2xvYmFsKFNldHRpbmdzLktFWV9DT05ORUNUX1BST0ZJTEUsIFwiZGVmYXVsdFwiKVxyXG4gICAgICAgICAgICAgICAgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgbGFzdF9uaWNrbmFtZSA9IHNldHRpbmdzLnN0YXRpY19nbG9iYWwoU2V0dGluZ3MuS0VZX0NPTk5FQ1RfVVNFUk5BTUUsIHVuZGVmaW5lZCk7XHJcbiAgICAgICAgICAgIGlmKGxhc3Rfbmlja25hbWUpIC8qIHJlc3RvcmUgKi9cclxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmNoYW5nZUdsb2JhbChTZXR0aW5ncy5LRVlfQ09OTkVDVF9VU0VSTkFNRSwgbGFzdF9uaWNrbmFtZSk7XHJcblxyXG4gICAgICAgICAgICBpbnB1dF9uaWNrbmFtZS52YWwobGFzdF9uaWNrbmFtZSk7XHJcbiAgICAgICAgICAgIGlucHV0X25pY2tuYW1lLm9uKFwia2V5dXBcIiwgKCkgPT4gdXBkYXRlRmllbGRzKHRydWUpKTtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB1cGRhdGVGaWVsZHMoZmFsc2UpLCAxMDApO1xyXG5cclxuICAgICAgICAgICAgY29uc3Qgc2VydmVyX2FkZHJlc3MgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWRkcmVzcyA9IGlucHV0X2FkZHJlc3MudmFsKCkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIGlmKGFkZHJlc3MubWF0Y2goUmVnZXguSVBfVjYpICYmICFhZGRyZXNzLnN0YXJ0c1dpdGgoXCJbXCIpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIltcIiArIGFkZHJlc3MgKyBcIl1cIjtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhZGRyZXNzO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBidXR0b25fY29ubmVjdC5vbignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBtb2RhbC5jbG9zZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBzZXJ2ZXJfY29ubmVjdGlvbnMuYWN0aXZlX2Nvbm5lY3Rpb25faGFuZGxlcigpO1xyXG4gICAgICAgICAgICAgICAgaWYoY29ubmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uc3RhcnRDb25uZWN0aW9uKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50X2Nvbm5lY3RfZGF0YSA/IGN1cnJlbnRfY29ubmVjdF9kYXRhLmFkZHJlc3MuaG9zdG5hbWUgKyBcIjpcIiArIGN1cnJlbnRfY29ubmVjdF9kYXRhLmFkZHJlc3MucG9ydCA6IHNlcnZlcl9hZGRyZXNzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkX3Byb2ZpbGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5pY2tuYW1lOiBpbnB1dF9uaWNrbmFtZS52YWwoKS50b1N0cmluZygpIHx8ICBpbnB1dF9uaWNrbmFtZS5hdHRyKFwicGxhY2Vob2xkZXJcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXNzd29yZDogKGN1cnJlbnRfY29ubmVjdF9kYXRhICYmIGN1cnJlbnRfY29ubmVjdF9kYXRhLnBhc3N3b3JkX2hhc2gpID8ge3Bhc3N3b3JkOiBjdXJyZW50X2Nvbm5lY3RfZGF0YS5wYXNzd29yZF9oYXNoLCBoYXNoZWQ6IHRydWV9IDoge3Bhc3N3b3JkOiBpbnB1dF9wYXNzd29yZC52YWwoKS50b1N0cmluZygpLCBoYXNoZWQ6IGZhbHNlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uX2Nvbm5lY3RfdGFiLnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBidXR0b25fY29ubmVjdF90YWIub24oJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgbW9kYWwuY2xvc2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gc2VydmVyX2Nvbm5lY3Rpb25zLnNwYXduX3NlcnZlcl9jb25uZWN0aW9uX2hhbmRsZXIoKTtcclxuICAgICAgICAgICAgICAgIHNlcnZlcl9jb25uZWN0aW9ucy5zZXRfYWN0aXZlX2Nvbm5lY3Rpb25faGFuZGxlcihjb25uZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uc3RhcnRDb25uZWN0aW9uKFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRfY29ubmVjdF9kYXRhID8gY3VycmVudF9jb25uZWN0X2RhdGEuYWRkcmVzcy5ob3N0bmFtZSArIFwiOlwiICsgY3VycmVudF9jb25uZWN0X2RhdGEuYWRkcmVzcy5wb3J0IDogIHNlcnZlcl9hZGRyZXNzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRfcHJvZmlsZSxcclxuICAgICAgICAgICAgICAgICAgICB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmlja25hbWU6IGlucHV0X25pY2tuYW1lLnZhbCgpLnRvU3RyaW5nKCkgfHwgIGlucHV0X25pY2tuYW1lLmF0dHIoXCJwbGFjZWhvbGRlclwiKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6IChjdXJyZW50X2Nvbm5lY3RfZGF0YSAmJiBjdXJyZW50X2Nvbm5lY3RfZGF0YS5wYXNzd29yZF9oYXNoKSA/IHtwYXNzd29yZDogY3VycmVudF9jb25uZWN0X2RhdGEucGFzc3dvcmRfaGFzaCwgaGFzaGVkOiB0cnVlfSA6IHtwYXNzd29yZDogaW5wdXRfcGFzc3dvcmQudmFsKCkudG9TdHJpbmcoKSwgaGFzaGVkOiBmYWxzZX1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICAgICAvKiBjb25uZWN0IGhpc3Rvcnkgc2hvdyAqL1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmb3IoY29uc3QgZW50cnkgb2YgY29ubmVjdGlvbl9sb2cuaGlzdG9yeSgpLnNsaWNlKDAsIDEwKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQuc3Bhd24oXCJkaXZcIikuYWRkQ2xhc3MoXCJyb3dcIikuYXBwZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnNwYXduKFwiZGl2XCIpLmFkZENsYXNzKFwiY29sdW1uIGRlbGV0ZVwiKS5hcHBlbmQoJC5zcGF3bihcImRpdlwiKS5hZGRDbGFzcyhcImljb25fZW0gY2xpZW50LWRlbGV0ZVwiKSkub24oJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSAkKGV2ZW50LnRhcmdldCkucGFyZW50cygnLnJvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LmhpZGUoMjUwLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LmRldGFjaCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uX2xvZy5kZWxldGVfZW50cnkoZW50cnkuYWRkcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJfZW1wdHkudG9nZ2xlKGNvbnRhaW5lcl9sYXN0X3NlcnZlcl9ib2R5LmNoaWxkcmVuKCkubGVuZ3RoID4gMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgKS5hcHBlbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQuc3Bhd24oXCJkaXZcIikuYWRkQ2xhc3MoXCJjb2x1bW4gbmFtZVwiKS5hcHBlbmQoW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgSWNvbk1hbmFnZXIuZ2VuZXJhdGVfdGFnKEljb25NYW5hZ2VyLmxvYWRfY2FjaGVkX2ljb24oZW50cnkuaWNvbl9pZCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5zcGF3bihcImFcIikudGV4dChlbnRyeS5uYW1lKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgICAgICkuYXBwZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnNwYXduKFwiZGl2XCIpLmFkZENsYXNzKFwiY29sdW1uIGFkZHJlc3NcIikudGV4dChlbnRyeS5hZGRyZXNzLmhvc3RuYW1lICsgKGVudHJ5LmFkZHJlc3MucG9ydCAhPSA5OTg3ID8gKFwiOlwiICsgZW50cnkuYWRkcmVzcy5wb3J0KSA6IFwiXCIpKVxyXG4gICAgICAgICAgICAgICAgICAgICkuYXBwZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnNwYXduKFwiZGl2XCIpLmFkZENsYXNzKFwiY29sdW1uIHBhc3N3b3JkXCIpLnRleHQoZW50cnkuZmxhZ19wYXNzd29yZCA/IHRyKFwiWWVzXCIpIDogdHIoXCJOb1wiKSlcclxuICAgICAgICAgICAgICAgICAgICApLmFwcGVuZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgJC5zcGF3bihcImRpdlwiKS5hZGRDbGFzcyhcImNvbHVtbiBjb3VudHJ5LW5hbWVcIikuYXBwZW5kKFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQuc3Bhd24oXCJkaXZcIikuYWRkQ2xhc3MoXCJjb3VudHJ5IGZsYWctXCIgKyBlbnRyeS5jb3VudHJ5LnRvTG93ZXJDYXNlKCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5zcGF3bihcImFcIikudGV4dChpMThuLmNvdW50cnlfbmFtZShlbnRyeS5jb3VudHJ5LCB0cihcIkdsb2JhbFwiKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgKS5hcHBlbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQuc3Bhd24oXCJkaXZcIikuYWRkQ2xhc3MoXCJjb2x1bW4gY2xpZW50c1wiKS50ZXh0KGVudHJ5LmNsaWVudHNfb25saW5lICsgXCIvXCIgKyBlbnRyeS5jbGllbnRzX3RvdGFsKVxyXG4gICAgICAgICAgICAgICAgICAgICkuYXBwZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnNwYXduKFwiZGl2XCIpLmFkZENsYXNzKFwiY29sdW1uIGNvbm5lY3Rpb25zXCIpLnRleHQoZW50cnkudG90YWxfY29ubmVjdGlvbiArIFwiXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgKS5vbignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudF9jb25uZWN0X2RhdGEgPSBlbnRyeTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyX2xhc3Rfc2VydmVyX2JvZHkuZmluZChcIi5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGV2ZW50LnRhcmdldCkucGFyZW50KCcucm93JykuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9hZGRyZXNzLnZhbChlbnRyeS5hZGRyZXNzLmhvc3RuYW1lICsgKGVudHJ5LmFkZHJlc3MucG9ydCAhPSA5OTg3ID8gKFwiOlwiICsgZW50cnkuYWRkcmVzcy5wb3J0KSA6IFwiXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRfcGFzc3dvcmQudmFsKGVudHJ5LmZsYWdfcGFzc3dvcmQgJiYgZW50cnkucGFzc3dvcmRfaGFzaCA/IFwiV29sdmVyaW5ERVYgWWVhaHIhXCIgOiBcIlwiKS50cmlnZ2VyKCdjaGFuZ2UnKTtcclxuICAgICAgICAgICAgICAgICAgICB9KS5vbignZGJsY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRfY29ubmVjdF9kYXRhID0gZW50cnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbl9jb25uZWN0LnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8oY29udGFpbmVyX2xhc3Rfc2VydmVyX2JvZHkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcl9lbXB0eS50b2dnbGUoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBhcHBseShtb2RhbC5odG1sVGFnLCBtb2RhbC5odG1sVGFnLCBtb2RhbC5odG1sVGFnKTtcclxuXHJcbiAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY29uc3QgUmVnZXggPSB7XHJcbiAgICAgICAgLy9ET01BSU48OnBvcnQ+XHJcbiAgICAgICAgRE9NQUlOOiAvXihsb2NhbGhvc3R8KCgoW2EtekEtWjAtOV8tXXswLDYzfVxcLil7MCwyNTN9KT9bYS16QS1aMC05Xy1dezAsNjN9XFwuW2EtekEtWl17Miw2NH0pKSh8Oig2NTUzWzAtNV18NjU1WzAtMl1bMC05XXw2NVswLTRdWzAtOV17Mn18NlswLTRdWzAtOV17M318WzAtNV0/WzAtOV17MSw0Nn0pKSQvLFxyXG4gICAgICAgIC8vSVA8OnBvcnQ+XHJcbiAgICAgICAgSVBfVjQ6IC8oXigoMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLil7M30oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KSkofDooNjU1M1swLTVdfDY1NVswLTJdWzAtOV18NjVbMC00XVswLTldezJ9fDZbMC00XVswLTldezN9fFswLTVdP1swLTldezEsNH0pKSQvLFxyXG4gICAgICAgIElQX1Y2OiAvKChbMC05YS1mQS1GXXsxLDR9Oil7Nyw3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszLDN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pKS8sXHJcbiAgICAgICAgSVA6IC9eKChbMC05XXxbMS05XVswLTldfDFbMC05XXsyfXwyWzAtNF1bMC05XXwyNVswLTVdKVxcLil7M30oWzAtOV18WzEtOV1bMC05XXwxWzAtOV17Mn18MlswLTRdWzAtOV18MjVbMC01XSkkfF4oKFthLXpBLVpdfFthLXpBLVpdW2EtekEtWjAtOVxcLV0qW2EtekEtWjAtOV0pXFwuKSooW0EtWmEtel18W0EtWmEtel1bQS1aYS16MC05XFwtXSpbQS1aYS16MC05XSkkfF5cXHMqKCgoWzAtOUEtRmEtZl17MSw0fTopezd9KFswLTlBLUZhLWZdezEsNH18OikpfCgoWzAtOUEtRmEtZl17MSw0fTopezZ9KDpbMC05QS1GYS1mXXsxLDR9fCgoMjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKFxcLigyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KChbMC05QS1GYS1mXXsxLDR9Oil7NX0oKCg6WzAtOUEtRmEtZl17MSw0fSl7MSwyfSl8OigoMjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKFxcLigyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KChbMC05QS1GYS1mXXsxLDR9Oil7NH0oKCg6WzAtOUEtRmEtZl17MSw0fSl7MSwzfSl8KCg6WzAtOUEtRmEtZl17MSw0fSk/OigoMjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKFxcLigyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KSl8OikpfCgoWzAtOUEtRmEtZl17MSw0fTopezN9KCgoOlswLTlBLUZhLWZdezEsNH0pezEsNH0pfCgoOlswLTlBLUZhLWZdezEsNH0pezAsMn06KCgyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoXFwuKDI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSl8KChbMC05QS1GYS1mXXsxLDR9Oil7Mn0oKCg6WzAtOUEtRmEtZl17MSw0fSl7MSw1fSl8KCg6WzAtOUEtRmEtZl17MSw0fSl7MCwzfTooKDI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKShcXC4oMjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoKFswLTlBLUZhLWZdezEsNH06KXsxfSgoKDpbMC05QS1GYS1mXXsxLDR9KXsxLDZ9KXwoKDpbMC05QS1GYS1mXXsxLDR9KXswLDR9OigoMjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKFxcLigyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KSl8OikpfCg6KCgoOlswLTlBLUZhLWZdezEsNH0pezEsN30pfCgoOlswLTlBLUZhLWZdezEsNH0pezAsNX06KCgyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoXFwuKDI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKCUuKyk/XFxzKiQvLFxyXG4gICAgfTtcclxufSJdLCJzb3VyY2VSb290IjoiIn0=