import {Registry} from "tc-shared/events";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/index";
import {manager, Sound} from "tc-shared/sound/Sounds";

function initialize_sounds(event_registry: Registry<ControlBarEvents>) {
    {
        let microphone_muted = undefined;
        event_registry.on("update_microphone_state", event => {
            if(microphone_muted === event.muted) return;
            if(typeof microphone_muted !== "undefined")
                manager.play(event.muted ? Sound.MICROPHONE_MUTED : Sound.MICROPHONE_ACTIVATED);
            microphone_muted = event.muted;
        })
    }
    {
        let speakers_muted = undefined;
        event_registry.on("update_speaker_state", event => {
            if(speakers_muted === event.muted) return;
            if(typeof speakers_muted !== "undefined")
                manager.play(event.muted ? Sound.SOUND_MUTED : Sound.SOUND_ACTIVATED);
            speakers_muted = event.muted;
        })
    }
}

export = (event_registry: Registry<ControlBarEvents>) => {
    initialize_sounds(event_registry);
};

//TODO: Left action handler!