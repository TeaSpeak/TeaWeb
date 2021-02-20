import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {config} from "tc-shared/i18n/localize";
import {getBackend} from "tc-shared/backend";
import {ClientServiceConfig, ClientServiceInvite, ClientServices, ClientSessionType, LocalAgent} from "tc-services";

import translation_config = config.translation_config;

export let clientServices: ClientServices;
export let clientServiceInvite: ClientServiceInvite;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 30,
    function: async () => {
        clientServices = new ClientServices(new class implements ClientServiceConfig {
            getServiceHost(): string {
                return "localhost:1244";
                return "client-services.teaspeak.de:27791";
            }

            getSessionType(): ClientSessionType {
                return __build.target === "web" ? ClientSessionType.WebClient : ClientSessionType.TeaClient;
            }

            generateHostInfo(): LocalAgent {
                if(__build.target === "client") {
                    const info = getBackend("native").getVersionInfo();

                    return {
                        clientVersion: info.version,
                        uiVersion: __build.version,

                        architecture: info.os_architecture,
                        platform: info.os_platform,
                        platformVersion: info.os_platform_version
                    };
                } else {
                    const os = window.detectedBrowser.os;
                    const osParts = os.split(" ");
                    let platformVersion;
                    if(osParts.last().match(/^[0-9.]+$/)) {
                        platformVersion = osParts.last();
                        osParts.splice(osParts.length - 1, 1);
                    }

                    return {
                        uiVersion: __build.version,

                        platform: osParts.join(" "),
                        platformVersion: platformVersion,
                        architecture: window.detectedBrowser.name,
                        clientVersion: window.detectedBrowser.version,
                    }
                }
            }

            getSelectedLocaleUrl(): string | null {
                const trConfig = translation_config();
                return trConfig?.current_translation_url || null;
            }
        });

        clientServices.start();
        (window as any).clientServices = clientServices;

        clientServiceInvite = new ClientServiceInvite(clientServices);
        (window as any).clientServiceInvite = clientServiceInvite;
    },
    name: "client services"
});