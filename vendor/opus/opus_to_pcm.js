var Decoder = (function (exports) {
'use strict';

function appendByteArray(buffer1, buffer2) {
    var tmp = new Uint8Array((buffer1.length | 0) + (buffer2.length | 0));
    tmp.set(buffer1, 0);
    tmp.set(buffer2, buffer1.length | 0);
    return tmp;
}

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Event = function () {
    function Event(type) {
        classCallCheck(this, Event);

        this.listener = {};
        this.type = type | '';
    }

    createClass(Event, [{
        key: 'on',
        value: function on(event, fn) {
            if (!this.listener[event]) {
                this.listener[event] = [];
            }
            this.listener[event].push(fn);
            return true;
        }
    }, {
        key: 'off',
        value: function off(event, fn) {
            if (this.listener[event]) {
                var index = this.listener[event].indexOf(fn);
                if (index > -1) {
                    this.listener[event].splice(index, 1);
                }
                return true;
            }
            return false;
        }
    }, {
        key: 'offAll',
        value: function offAll() {
            this.listener = {};
        }
    }, {
        key: 'dispatch',
        value: function dispatch(event, data) {
            if (this.listener[event]) {
                this.listener[event].map(function (each) {
                    each.apply(null, [data]);
                });
                return true;
            }
            return false;
        }
    }]);
    return Event;
}();

var Ogg = function (_Event) {
    inherits(Ogg, _Event);

    function Ogg(channel) {
        classCallCheck(this, Ogg);

        var _this = possibleConstructorReturn(this, (Ogg.__proto__ || Object.getPrototypeOf(Ogg)).call(this, 'ogg'));

        _this.channel = channel;
        _this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        _this.queue = [];
        _this.flushLimit = 20; /* the larger flush limit, the lesser clicking noise */
        _this.init();
        return _this;
    }

    createClass(Ogg, [{
        key: 'getSampleRate',
        value: function getSampleRate() {
            return this.audioCtx.sampleRate;
        }
    }, {
        key: 'init',
        value: function init() {
            var header = void 0,
                page = void 0;

            this.oggHeader = new Uint8Array();
            this.pageIndex = 0;
            this.serial = Math.ceil(Math.random() * Math.pow(2, 32));
            this.initChecksumTable();

            /* ID Header */
            header = this.getIDHeader();
            page = this.getPage(header, 2); // headerType of ID header is 2 i.e beginning of stream
            this.oggHeader = appendByteArray(this.oggHeader, page);

            /* comment Header */
            header = this.getCommentHeader();
            page = this.getPage(header, 0); // headerType of comment header is 0
            this.oggHeader = appendByteArray(this.oggHeader, page);
        }
    }, {
        key: 'getIDHeader',
        value: function getIDHeader() {
            var data = new Uint8Array(19),
                dv = new DataView(data.buffer);
            dv.setUint32(0, 1937076303, true); // Magic Signature 'Opus'
            dv.setUint32(4, 1684104520, true); // Magic Signature 'Head'
            dv.setUint8(8, 1, true); // Version
            dv.setUint8(9, this.channel, true); // Channel count
            dv.setUint16(10, 0, true); // pre-skip, don't need to skip any value
            dv.setUint32(12, 8000, true); // original sample rate, any valid sample e.g 8000
            dv.setUint16(16, 0, true); // output gain
            dv.setUint8(18, 0, true); // channel map 0 = one stream: mono or stereo
            return data;
        }
    }, {
        key: 'getCommentHeader',
        value: function getCommentHeader() {
            var data = new Uint8Array(20),
                dv = new DataView(data.buffer);
            dv.setUint32(0, 1937076303, true); // Magic Signature 'Opus'
            dv.setUint32(4, 1936154964, true); // Magic Signature 'Tags'
            dv.setUint32(8, 4, true); // Vendor Length
            dv.setUint32(12, 1633837924, true); // Vendor name 'abcd'
            dv.setUint32(16, 0, true); // User Comment List Length
            return data;
        }
    }, {
        key: 'getPage',
        value: function getPage(segmentData, headerType) {

            /* ref: https://tools.ietf.org/id/draft-ietf-codec-oggopus-00.html */
            var segmentTable = new Uint8Array(1); /* segment table stores segment length map. always providing one single segment */
            var page = new Uint8Array(27 + segmentTable.byteLength + segmentData.byteLength);
            var pageDV = new DataView(page.buffer);
            segmentTable[0] = segmentData.length;

            pageDV.setUint32(0, 1399285583, true); // page headers starts with 'OggS'
            pageDV.setUint8(4, 0, true); // Version
            pageDV.setUint8(5, headerType, true); // 1 = continuation, 2 = beginning of stream, 4 = end of stream
            pageDV.setUint32(6, -1, true); // granuale position -1 i.e single packet per page. storing into bytes.
            pageDV.setUint32(10, -1, true);
            pageDV.setUint32(14, this.serial, true); // Bitstream serial number
            pageDV.setUint32(18, this.pageIndex++, true); // Page sequence number
            pageDV.setUint8(26, 1, true); // Number of segments in page, giving always 1 segment

            page.set(segmentTable, 27); // Segment Table inserting at 27th position since page header length is 27
            page.set(segmentData, 28); // inserting at 28th since Segment Table(1) + header length(27)
            pageDV.setUint32(22, this.getChecksum(page), true); // Checksum - generating for page data and inserting at 22th position into 32 bits

            return page;
        }
    }, {
        key: 'getOGG',
        value: function getOGG() {
            var oggData = this.oggHeader,
                packet = void 0,
                segmentData = void 0,
                headerType = void 0;

            while (this.queue.length) {
                packet = this.queue.shift();
                headerType = this.queue.length == 0 ? 4 : 0; // for last packet, header type should be end of stream
                segmentData = this.getPage(packet, headerType);
                oggData = appendByteArray(oggData, segmentData);
            }

            this.pageIndex = 2; /* reseting pageIndex to 2 so we can re-use same header */
            return oggData;
        }
    }, {
        key: 'getChecksum',
        value: function getChecksum(data) {
            var checksum = 0;
            for (var i = 0; i < data.length; i++) {
                checksum = checksum << 8 ^ this.checksumTable[checksum >>> 24 & 0xff ^ data[i]];
            }
            return checksum >>> 0;
        }
    }, {
        key: 'initChecksumTable',
        value: function initChecksumTable() {
            this.checksumTable = [];
            for (var i = 0; i < 256; i++) {
                var r = i << 24;
                for (var j = 0; j < 8; j++) {
                    r = (r & 0x80000000) != 0 ? r << 1 ^ 0x04c11db7 : r << 1;
                }
                this.checksumTable[i] = r & 0xffffffff;
            }
        }
    }, {
        key: 'decode',
        value: function decode(packet) {
            this.queue.push(packet);
            if (this.queue.length >= this.flushLimit) {
                this.process();
            }
        }
    }, {
        key: 'process',
        value: function process() {
            var _this2 = this;

            var ogg = this.getOGG();
            this.audioCtx.decodeAudioData(ogg.buffer, function (audioBuffer) {
                var pcmFloat = void 0;
                if (_this2.channel == 1) {
                    pcmFloat = audioBuffer.getChannelData(0);
                } else {
                    pcmFloat = _this2.getMergedPCMData(audioBuffer);
                }
                _this2.dispatch('data', pcmFloat);
            });
        }
    }, {
        key: 'getMergedPCMData',
        value: function getMergedPCMData(audioBuffer) {
            var audioData = void 0,
                result = [],
                length = void 0,
                pcmFloat = void 0,
                offset = 0,
                i = 0,
                j = 0;

            for (i = 0; i < this.channel; i++) {
                audioData = audioBuffer.getChannelData(i);
                result.push(audioData);
            }

            length = result[0].length;
            pcmFloat = new Float32Array(this.channel * length);
            i = 0;
            while (length > i) {
                for (j = 0; j < this.channel; j++) {
                    pcmFloat[offset++] = result[j][i];
                }
                i++;
            }
            return pcmFloat;
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.audioCtx.close();
            this.oggHeader = null;
            this.audioCtx = null;
            this.checksumTable = null;
            this.offAll();
        }
    }]);
    return Ogg;
}(Event);

var OpusWorker = function (_Event) {
    inherits(OpusWorker, _Event);

    function OpusWorker(channels) {
        classCallCheck(this, OpusWorker);

        var _this = possibleConstructorReturn(this, (OpusWorker.__proto__ || Object.getPrototypeOf(OpusWorker)).call(this, 'worker'));

        _this.worker = new Worker('libopus/opus.min.js');
        _this.worker.addEventListener('message', _this.handleWebSocketMessage.bind(_this));
        _this.worker.postMessage({
            type: 'init',
            config: {
                rate: 24000,
                channels: channels
            }
        });
        return _this;
    }

    createClass(OpusWorker, [{
        key: 'getSampleRate',
        value: function getSampleRate() {
            return 24000;
        }
    }, {
        key: 'decode',
        value: function decode(packet) {
            var workerData = {
                type: 'decode',
                buffer: packet
            };
            this.worker.postMessage(workerData);
        }
    }, {
        key: 'handleWebSocketMessage',
        value: function onMessage(event) {
            var data = event.data;
            this.dispatch('data', data.buffer);
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.worker = null;
            this.offAll();
        }
    }]);
    return OpusWorker;
}(Event);

var OpusToPCM = function (_Event) {
    inherits(OpusToPCM, _Event);

    function OpusToPCM(options) {
        classCallCheck(this, OpusToPCM);

        var _this = possibleConstructorReturn(this, (OpusToPCM.__proto__ || Object.getPrototypeOf(OpusToPCM)).call(this, 'decoder'));

        window.MediaSource = window.MediaSource || window.WebKitMediaSource;
        var nativeSupport = !!(window.MediaSource && window.MediaSource.isTypeSupported('audio/webm; codecs=opus'));
        var defaults$$1 = {
            channels: 1,
            fallback: true
        };
        options = Object.assign({}, defaults$$1, options);

        if (nativeSupport) {
            _this.decoder = new Ogg(options.channels);
        } else if (options.fallback) {
            _this.decoder = new OpusWorker(options.channels);
        } else {
            _this.decoder = null;
        }

        if (_this.decoder) {
            _this.decoder.on('data', _this.onData.bind(_this));
        }
        return _this;
    }

    createClass(OpusToPCM, [{
        key: 'getSampleRate',
        value: function getSampleRate() {
            return this.decoder.getSampleRate();
        }
    }, {
        key: 'onData',
        value: function onData(data) {
            this.dispatch('decode', data);
        }
    }, {
        key: 'decode',
        value: function decode(packet) {
            if (!this.decoder) {
                throw 'opps! no decoder is found to decode';
            }
            this.decoder.decode(packet);
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.decoder.destroy();
            this.offAll();
        }
    }]);
    return OpusToPCM;
}(Event);

exports.OpusToPCM = OpusToPCM;

return exports;

}({}));
