interface Window {
    grecaptcha: GReCaptcha;
}

interface GReCaptcha {
    render(container: string | HTMLElement, parameters: {
        sitekey: string;
        theme?: "dark" | "light";
        size?: "compact" | "normal";

        tabindex?: number;

        callback?: (token: string) => any;
        "expired-callback"?: () => any;
        "error-callback"?: (error: any) => any;
    }) : string; /* widget_id */

    reset(widget_id?: string);
}

namespace forum {
    export namespace gcaptcha {
        export async function initialize() {
            if(typeof(window.grecaptcha) === "undefined") {
                let script = document.createElement("script");
                script.async = true;

                let timeout;
                const callback_name = "captcha_callback_" + Math.random().toString().replace(".", "");
                try {
                    await new Promise((resolve, reject) => {
                        script.onerror = reject;
                        window[callback_name] = resolve;
                        script.src = "https://www.google.com/recaptcha/api.js?onload=" + encodeURIComponent(callback_name) + "&render=explicit";

                        document.body.append(script);
                        timeout = setTimeout(() => reject("timeout"), 15000);
                    });
                } catch(error) {
                    script.remove();
                    script = undefined;

                    console.error(tr("Failed to fetch recaptcha javascript source: %o"), error);
                    throw tr("failed to download source");
                } finally {
                    if(script)
                        script.onerror = undefined;
                    delete window[callback_name];
                    clearTimeout(timeout);
                }
            }

            if(typeof(window.grecaptcha) === "undefined")
                throw tr("failed to load recaptcha");
        }

        export async function spawn(container: JQuery, key: string, callback_data: (token: string) => any) {
            try {
                await initialize();
            } catch(error) {
                console.error(tr("Failed to initialize G-Recaptcha. Error: %o"), error);
                throw tr("initialisation failed");
            }
            if(container.attr("captcha-uuid"))
                window.grecaptcha.reset(container.attr("captcha-uuid"));
            else {
                container.attr("captcha-uuid", window.grecaptcha.render(container[0], {
                    "sitekey": key,
                    callback: callback_data
                }));
            }
        }
    }

    function api_url() {
        return settings.static_global(Settings.KEY_TEAFORO_URL);
    }

    export class Data {
        readonly auth_key: string;
        readonly raw: string;
        readonly sign: string;

        parsed: {
            user_id: number;
            user_name: string;

            data_age: number;

            user_group_id: number;

            is_staff: boolean;
            user_groups: number[];
        };

        constructor(auth: string, raw: string, sign: string) {
            this.auth_key = auth;
            this.raw = raw;
            this.sign = sign;

            this.parsed = JSON.parse(raw);
        }


        data_json() : string { return this.raw; }
        data_sign() : string { return this.sign; }

        name() : string { return this.parsed.user_name; }

        user_id() { return this.parsed.user_id; }
        user_group() { return this.parsed.user_group_id; }

        is_stuff() : boolean { return this.parsed.is_staff; }
        is_premium() : boolean { return this.parsed.user_groups.indexOf(5) != -1; }

        data_age() : Date { return new Date(this.parsed.data_age); }

        is_expired() : boolean { return this.parsed.data_age + 48 * 60 * 60 * 1000 < Date.now(); }
        should_renew() : boolean { return this.parsed.data_age + 24 * 60 * 60 * 1000 < Date.now(); } /* renew data all 24hrs */
    }
    let _data: Data | undefined;

    export function logged_in() : boolean {
        return !!_data && !_data.is_expired();
    }

    export function data() : Data { return _data; }

    export interface LoginResult {
        status: "success" | "captcha" | "error";

        error_message?: string;
        captcha?: {
            type: "gre-captcha" | "unknown";
            data: any; /* in case of gre-captcha it would be the side key */
        };
    }

    export async function login(username: string, password: string, captcha?: any) : Promise<LoginResult> {
        let response;
        try {
            response = await new Promise<any>((resolve, reject) => {
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
                })
            });
        } catch(error) {
            return {
                status: "error",
                error_message: tr("failed to send login request")
            };
        }

        if(response["status"] !== "ok") {
            console.error(tr("Response status not okey. Error happend: %o"), response);
            return {
                status: "error",
                error_message: (response["errors"] || [])[0] || tr("Unknown error")
            };
        }

        if(!response["success"]) {
            console.error(tr("Login failed. Response %o"), response);

            let message = tr("failed to login");
            let captcha;
            /* user/password wrong | and maybe captcha required */
            if(response["code"] == 1 || response["code"] == 3)
                message = tr("Invalid username or password");
            if(response["code"] == 2 || response["code"] == 3) {
                captcha = {
                    type: response["captcha"]["type"],
                    data: response["captcha"]["siteKey"] //TODO: Why so static here?
                };
                if(response["code"] == 2)
                    message = tr("captcha required");
            }

            return {
                status: typeof(captcha) !== "undefined" ? "captcha" : "error",
                error_message: message,
                captcha: captcha
            };
        }
        //document.cookie = "user_data=" + response["data"] + ";path=/";
        //document.cookie = "user_sign=" + response["sign"] + ";path=/";

        try {
            _data = new Data(response["auth-key"], response["data"], response["sign"]);
            localStorage.setItem("teaspeak-forum-data", response["data"]);
            localStorage.setItem("teaspeak-forum-sign", response["sign"]);
            localStorage.setItem("teaspeak-forum-auth", response["auth-key"]);
            profiles.identities.update_forum();
        } catch(error) {
            console.error(tr("Failed to parse forum given data: %o"), error);
            return {
                status: "error",
                error_message: tr("Failed to parse response data")
            }
        }

        return {
            status: "success"
        };
    }

    export async function renew_data() : Promise<"success" | "login-required"> {
        let response;
        try {
            response = await new Promise<any>((resolve, reject) => {
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
                })
            });
        } catch(error) {
            throw tr("failed to send renew request");
        }

        if(response["status"] !== "ok") {
            console.error(tr("Response status not okey. Error happend: %o"), response);
            throw (response["errors"] || [])[0] || tr("Unknown error");
        }

        if(!response["success"]) {
            if(response["code"] == 1) {
                return "login-required";
            }
            throw "invalid error code (" + response["code"] + ")";
        }
        if(!response["data"] || !response["sign"])
            throw tr("response missing data");

        console.debug(tr("Renew succeeded. Parsing data."));

        try {
            _data = new Data(_data.auth_key, response["data"], response["sign"]);
            localStorage.setItem("teaspeak-forum-data", response["data"]);
            localStorage.setItem("teaspeak-forum-sign", response["sign"]);
            profiles.identities.update_forum();
        } catch(error) {
            console.error(tr("Failed to parse forum given data: %o"), error);
            throw tr("failed to parse data");
        }

        return "success";
    }

    export async function logout() : Promise<void> {
        if(!logged_in())
            return;

        let response;
        try {
            response = await new Promise<any>((resolve, reject) => {
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
                })
            });
        } catch(error) {
            throw tr("failed to send logout request");
        }

        if(response["status"] !== "ok") {
            console.error(tr("Response status not okey. Error happend: %o"), response);
            throw (response["errors"] || [])[0] || tr("Unknown error");
        }

        if(!response["success"]) {
            /* code 1 means not logged in, its an success */
            if(response["code"] != 1) {
                throw "invalid error code (" + response["code"] + ")";
            }
        }

        _data = undefined;
        localStorage.removeItem("teaspeak-forum-data");
        localStorage.removeItem("teaspeak-forum-sign");
        localStorage.removeItem("teaspeak-forum-auth");
        profiles.identities.update_forum();
    }

    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "TeaForo initialize",
        priority: 10,
        function: async () => {
            const raw_data = localStorage.getItem("teaspeak-forum-data");
            const raw_sign = localStorage.getItem("teaspeak-forum-sign");
            const forum_auth = localStorage.getItem("teaspeak-forum-auth");
            if(!raw_data || !raw_sign || !forum_auth) {
                console.log(tr("No TeaForo authentification found. TeaForo connection status: unconnected"));
                return;
            }

            try {
                _data = new Data(forum_auth, raw_data, raw_sign);
            } catch(error) {
                console.error(tr("Failed to initialize TeaForo connection from local data. Error: %o"), error);
                return;
            }
            if(_data.should_renew()) {
                console.info(tr("TeaForo data should be renewed. Executing renew."));
                renew_data().then(status => {
                    if(status === "success") {
                        console.info(tr("TeaForo data has been successfully renewed."));
                    } else {
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

            if(_data && _data.is_expired()) {
                console.error(tr("TeaForo data is expired. TeaForo connection isn't available!"));
            }
        }
    })
}