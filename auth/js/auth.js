$("#btn_login").click(function () {
    let _this = $(this);
    _this.attr("disabled", "true");
    _this.empty();
    spawnLoader().appendTo(_this);
    $("<a></a>").text(" Logging in").appendTo(_this);
    submitLogin(_this, $("#user").val(), $("#pass").val())
});

function submitLogin(_this, user, pass) {
    $.ajax({
        url: "auth.php?type=login",
        type: "POST",
        cache: false,
        data: {
            user: user,
            pass: pass
        },
        success: function(result){
            setTimeout(function () {
                let data;
                try {
                    data = JSON.parse(result);
                } catch(e) {
                    loginFailed("Invalid response: " + result);
                    return;
                }
                if(data["success"] == false) {
                    loginFailed(data["msg"]);
                    return;
                }
                if(data["allowed"] == false) {
                    loginFailed("You're not allowed for the closed alpha!");
                    return;
                }
                $("#login").hide(500);
                $("#success").show(500);

                document.cookie = data["sessionName"] + "=" + data["sessionId"] + ";path=/";
                document.cookie = data["cookie_name_data"] + "=" + data["user_data"] + ";path=/";
                document.cookie = data["cookie_name_sign"] + "=" + data["user_sign"] + ";path=/";
                console.log(result);

                setTimeout(function () {
                    window.location.href = _this.attr("target");
                }, 1000 + Math.random() % 1500);
            }, 500 + Math.random() % 500);
        },
        error: function (xhr,status,error) {
            loginFailed("Invalid request (" + status + ") => " + error);
        }
    });
}

function loginFailed(err = "") {
    let button = $("#btn_login");
    button.empty();
    button.removeAttr("disabled");
    $("<a></a>").text("Login").appendTo(button);

    let errTag = $(".box .error");
    if(err !== "") {
        errTag.text(err).show(500);
    } else errTag.hide(500);
}

//<i class="fa fa-circle-o-notch fa-spin" id="login-loader"></i>

function spawnLoader() {
    let tag = $("<i></i>");
    tag.addClass("fa fa-circle-o-notch fa-spin");
    return tag;
}

$("#user").on('keydown', event => {
   if(event.key == "Enter") $("#pass").focus();
});

$("#pass").on('keydown', event => {
    if(event.key == "Enter") $("#btn_login").trigger("click");
});