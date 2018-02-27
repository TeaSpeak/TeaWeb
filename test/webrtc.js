/**
 * This a minimal fully functional example for setting up a client written in JavaScript that
 * communicates with a server via WebRTC data channels. This uses WebSockets to perform the WebRTC
 * handshake (offer/accept SDP) with the server. We only use WebSockets for the initial handshake
 * because TCP often presents too much latency in the context of real-time action games. WebRTC
 * data channels, on the other hand, allow for unreliable and unordered message sending via SCTP
 *
 * Brian Ho
 * brian@brkho.com
 */


/*
const audioContext = new AudioContext();
const speakers = audioContext.destination;
const audioBuffer = audioContext.createBuffer(1, 48000, 48000);

var mediaSource = new MediaSource();
const audio = document.getElementById("audio");
audio.src = window.URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceopen', function() {
    var sourceBuffer = mediaSource.addSourceBuffer('audio/webm;codecs=opus');
    sourceBuffer.appendWindowStart = 0;
    sourceBuffer.mode = 'segments';

    navigator.getUserMedia({video: false, audio: true}, function (stream) {
        var options = {
            audioBitsPerSecond: 48000, //128000,
            //videoBitsPerSecond : 2500000,
            mimeType: "audio/webm;codecs=opus" //
        };

        var mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.ondataavailable = function (e) {


            let now = new Date().getUTCMilliseconds();
            var fileReader = new FileReader();
            fileReader.onload = function () {//onloadend
                    console.log(e);

                    console.log(fileReader.result);
                    /*
                    audioBuffer.getChannelData(0).set(fileReader.result);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(speakers);
                    source.start();



                                   // single opus packet and it is a typedArray
                                  // decoder.decode(fileReader.result);

                    let buf = new Uint8Array(fileReader.result);
                    buf.timestampOffset = 0;
                    sourceBuffer.appendBuffer(buf);
                    if(audio.paused) {
                        audio.play(0);
                    }
                    let later = new Date().getUTCMilliseconds();
                    console.log(later - now);
                    console.log(sourceBuffer.buffered);

                    if (i === NUM_CHUNKS - 1) {
                        mediaSource.endOfStream();
                    } else {
                        if ($("audio").paused) {
                            // start playing after first chunk is appended
                            $("audio").play();
                        }
                        //readChunk(++i);
                        console.log("Read chunk?");
                    }


            };
            fileReader.readAsArrayBuffer(e.data);
        };
        mediaRecorder.start(20);
    }, function () {
        console.log("Cant applay audio");
    });
});


// Callback for when the data channel was successfully opened.
var decoder = new Decoder.OpusToPCM({
    channels: 1,
    fallback: true
});
decoder.decoder.on("error", function (pcmData) {
    //do whatever you want to do with PCM data
    console.log("PCM:");
    console.log(pcmData);
});
decoder.on("decode", function (pcmData) {
    //do whatever you want to do with PCM data
    console.log("DDDD:");
    console.log(pcmData);

    audioBuffer.getChannelData(0).set(pcmData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(speakers);
    source.start();

});
console.log(decoder);

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// TODO: Figure out what else we need and give the user feedback if he doesn't
// support microphone input.
if (navigator.getUserMedia) {
    captureMicrophone();
}
// First Step - Capture microphone and process the input
function captureMicrophone() {
    // process input from microphone
    const processAudio = ev => processBuffer(ev.inputBuffer.getChannelData(CHANNEL));

    // setup media stream from microphone
    const microphoneStream = stream => {
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(processor);
        // #1 If we don't pass through to speakers 'audioprocess' won't be triggerd
        processor.connect(mute);
    };
    // TODO: Handle error properly (see todo above - but probably more specific)
    const userMediaError = err => console.error(err);

    // Second step - Process buffer and output to speakers
    const processBuffer = buffer => {
        console.log(buffer);
        audioBuffer.getChannelData(CHANNEL).set(buffer);
        // We could move this out but that would affect audio quality
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(speakers);
        source.start();
    }

    const audioContext = new AudioContext();
    const speakers = audioContext.destination;
    // We currently only operate on this channel we might need to add a couple
    // lines of code if this fact changes
    const CHANNEL = 0;
    const CHANNELS = 1;
    const BUFFER_SIZE = 4096;
    const audioBuffer = audioContext.createBuffer(CHANNELS, BUFFER_SIZE, audioContext.sampleRate);

    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);

    // #2 Not needed we could directly pass through to speakers since there's no
    // data anyway but just to be sure that we don't output anything
    const mute = audioContext.createGain();
    //mute.gain.value = 1;
    mute.connect(speakers);

    processor.addEventListener('audioprocess', processAudio);
    navigator.getUserMedia({audio: true}, microphoneStream, userMediaError);
}
*/


//###########################################################################################
console.log(AV.Decoder.find("opus")());
var player = AV.Player.fromURL('videoplayback.opus');
player.play();