/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="Identity.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
/// <reference path="ui/modal/ModalCreateChannel.ts" />
/// <reference path="ui/modal/ModalBanClient.ts" />
/// <reference path="ui/modal/ModalYesNo.ts" />
/// <reference path="codec/CodecWrapper.ts" />
/// <reference path="settings.ts" />
/// <reference path="log.ts" />

let settings: Settings;
let globalClient: TSClient;
let chat: ChatBox;

let forumIdentity: TeaForumIdentity;

function main() {
    $.views.settings.allowCode(true);
    $.views.tags("rnd", (argument) => {
        let min = parseInt(argument.substr(0, argument.indexOf('~')));
        let max = parseInt(argument.substr(argument.indexOf('~') + 1));

        return (Math.round(Math.random() * (min + max + 1) - min)).toString();
    });
    //http://localhost:63343/Web-Client/index.php?_ijt=omcpmt8b9hnjlfguh8ajgrgolr&default_connect_url=true&default_connect_type=teamspeak&default_connect_url=localhost%3A9987&disableUnloadDialog=1&loader_ignore_age=1
    AudioController.initializeAudioController();
    if(!TSIdentityHelper.setup()) { console.error("Could not setup the TeamSpeak identity parser!"); return; }

    settings = new Settings();
    globalClient = new TSClient();
    /** Setup the XF forum identity **/
    if(settings.static("forum_user_data")) {
        forumIdentity = new TeaForumIdentity(settings.static("forum_user_data"), settings.static("forum_user_sign"));
    }

    chat = new ChatBox($("#chat"));
    globalClient.setup();


    if(!settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) {
        window.addEventListener("beforeunload", function (event) {
            if(globalClient.serverConnection && globalClient.serverConnection.connected)
                event.returnValue = "Are you really sure?<br>You're still connected!";
            //event.preventDefault();
        });
    }
    //Modals.spawnConnectModal();
    //Modals.spawnSettingsModal();
    //Modals.createChannelModal(undefined);

    if(settings.static("default_connect_url")) {
        switch (settings.static("default_connect_type")) {
            case "teaforo":
                if(forumIdentity.valid())
                    globalClient.startConnection(settings.static("default_connect_url"), forumIdentity);
                else
                    Modals.spawnConnectModal(settings.static("default_connect_url"), IdentitifyType.TEAFORO);
                break;

            case "teamspeak":
                let connectIdentity = TSIdentityHelper.loadIdentity(settings.global("connect_identity_teamspeak_identity", ""));
                if(!connectIdentity || !connectIdentity.valid())
                    Modals.spawnConnectModal(settings.static("default_connect_url"), IdentitifyType.TEAMSPEAK);
                else
                    globalClient.startConnection(settings.static("default_connect_url"), connectIdentity);
                break;

            default:
                Modals.spawnConnectModal(settings.static("default_connect_url"));
        }
    }

    let frame = $("#tmpl_music_frame").renderTag({
        song_name: "Hello world song and i don't really know what i should write! XXXXXXXXXXXXX"
    }).css("align-self", "center");

    /* Play/Pause logic */
    console.log(frame.find(".button_play"));
    frame.find(".button_play").click(handler => {
        frame.find(".button_play").addClass("active");
        frame.find(".button_pause").removeClass("active");
    });
    frame.find(".button_pause").click(handler => {
        frame.find(".button_pause").addClass("active");
        frame.find(".button_play").removeClass("active");
    });

    /* Required flip card javascript */
    frame.find(".right").mouseenter(() => {
        frame.find(".controls-overlay").addClass("flipped");
    });
    frame.find(".right").mouseleave(() => {
        frame.find(".controls-overlay").removeClass("flipped");
    });

    /* Slider */
    frame.find(".timeline .slider").on('mousedown', ev => {
        let timeline = frame.find(".timeline");
        let time = frame.find(".time");
        let slider = timeline.find(".slider");
        let slider_old = slider.attr("index");
        if(!slider_old || slider_old.length == 0) slider_old = "0";

        slider.prop("editing", true);

        let move_handler = (event: MouseEvent) => {
            let max = timeline.width();
            let current = event.pageX - timeline.offset().left - slider.width() / 2;
            if(current < 0) current = 0;
            else if(current > max) current = max;

            time.text(Math.ceil(current / max * 100)); //FIXME!
            slider.attr("index", current / max * 100);
            slider.css("margin-left", current / max * 100 + "%");
        };
        $(document).on('mousemove', move_handler as any);
        $(document).one('mouseup mouseleave mousedown', event => {
            console.log("Event (%i | %s): %o", event.button, event.type, event);
            if(event.type == "mousedown" && event.button != 2) return;

            $(document).unbind("mousemove", move_handler as any);
            if(event.type != "mousedown") {
                slider.prop("editing", false);
                console.log("Done!");
            } else { //Restore old
                event.preventDefault();
                time.text(slider_old); //FIXME!
                slider.attr("index", slider_old);
                slider.css("margin-left", slider_old + "%");
            }
        });

        ev.preventDefault();
        return false;
    });

    $("#music-test").replaceWith(frame);

    /*
    let tag = $("#tmpl_music_frame").renderTag({
        //thumbnail: "img/loading_image.svg"
    });



    $("#music-test").replaceWith(tag);

    //Modals.spawnSettingsModal();
    /*
    Modals.spawnYesNo("Are your sure?", "Do you really want to exit?", flag => {
        console.log("Response: " + flag);
    })
    */
}

app.loadedListener.push(() => {
    main();
    $(document).one('click', event => AudioController.initializeFromGesture());
});