const btn_login = $("#btn_login");

btn_login.on('click', () => {
    btn_login
        .prop("disabled", true)
        .empty()
        .append($(document.createElement("i")).addClass("fa fa-circle-o-notch fa-spin"));
    submitLogin($("#user").val() as string, $("#pass").val() as string);
});

function submitLogin(user: string, pass: string) {
    $.ajax({
        url: "auth.php?type=login",
        type: "POST",
        cache: false,
        data: {
            user: user,
            pass: pass
        },
        success: (result: string) => {
            setTimeout(() => {
                let data;
                try {
                    data = JSON.parse(result);
                } catch (e) {
                    loginFailed("Invalid response: " + result);
                    return;
                }
                if (data["success"] == false) {
                    loginFailed(data["msg"]);
                    return;
                }
                if (data["allowed"] == false) {
                    loginFailed("You're not allowed for the closed beta!");
                    return;
                }
                $("#login").hide(500);
                $("#success").show(500);

                document.cookie = data["sessionName"] + "=" + data["sessionId"] + ";path=/";
                document.cookie = data["cookie_name_data"] + "=" + data["user_data"] + ";path=/";
                document.cookie = data["cookie_name_sign"] + "=" + data["user_sign"] + ";path=/";
                console.log(result);

                setTimeout(() => {
                    window.location.href = btn_login.attr("target");
                }, 1000 + Math.random() % 1500);
            }, 500 + Math.random() % 500);
        },
        error: function (xhr,status,error) {
            loginFailed("Invalid request (" + status + ") => " + error);
        }
    });
}

function loginFailed(err: string = "") {
    btn_login
        .prop("disabled", false)
        .empty()
        .append($(document.createElement("a")).text("Login"));

    let errTag = $(".box .error");
    if(err !== "") {
        errTag.text(err).show(500);
    } else errTag.hide(500);
}

//<i class="fa fa-circle-o-notch fa-spin" id="login-loader"></i>

$("#user").on('keydown', event => {
   if(event.key == "Enter") $("#pass").focus();
});

$("#pass").on('keydown', event => {
    if(event.key == "Enter") $("#btn_login").trigger("click");
});