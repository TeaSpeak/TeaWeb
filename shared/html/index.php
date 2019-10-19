<?php
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);

	$WEB_CLIENT = http_response_code() !== false;
    $localhost = false;
    if(gethostname() == "WolverinDEV")
        $localhost = true;
?>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <!-- App min width: 450px -->
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, min-zoom=1, max-zoom: 1, user-scalable=no">
        <meta name="description" content="The TeaSpeak Web client is a in the browser running client for the VoIP communication software TeaSpeak." />
        <meta name="keywords" content="TeaSpeak, TeaWeb, TeaSpeak-Web,Web client TeaSpeak, веб клієнт TeaSpeak, TSDNS, багатомовність, мультимовність, теми, функціонал"/>

        <meta name="og:description" content="The TeaSpeak Web client is a in the browser running client for the VoIP communication software TeaSpeak." />
        <meta name="og:url" content="https://web.teaspeak.de/">
        <!-- WHAT THE HELL? <meta name="og:image" content="https://www.whatsapp.com/img/whatsapp-promo.png"> -->

        <!-- TODO Needs some fix -->
        <link rel="manifest" href="manifest.json">

<?php
            if(!$WEB_CLIENT) {
                echo "\t\t<title>TeaClient</title>" . PHP_EOL;
				echo "\t\t<meta name='og:title' content='TeaClient'>" . PHP_EOL;
            } else {
				echo "\t\t<title>TeaSpeak-Web</title>" . PHP_EOL;
				echo "\t\t<meta name='og:title' content='TeaSpeak-Web'>" . PHP_EOL;
				echo "\t\t<link rel='shortcut icon' href='img/favicon/teacup.png' type='image/x-icon'>" . PHP_EOL;
				//<link rel="apple-touch-icon" sizes="194x194" href="/apple-touch-icon.png" type="image/png">
            }
?>

        <!-- PHP generated properties -->
        <x-properties id="properties" style="display: none">
<?php
				function spawn_property($name, $value, $element_id = null)
				{
				    if(isset($value))
					    echo "\t\t\t<x-property key=\"" . $name . "\" " . (isset($element_id) ? "id=\"" . $element_id . "\" " : "") . "value=\"" . urlencode($value) . "\"></x-property>\r\n";
				}

				spawn_property('connect_default_host', $localhost ? "localhost" : "ts.TeaSpeak.de");
				spawn_property('localhost_debug', $localhost ? "true" : "false");

				$version = file_get_contents("./version");
				if ($version === false)
				    $version = "unknown";
				spawn_property("version", $version, "app_version");
?>
        </x-properties>

        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <meta name="format-detection" content="telephone=no">

        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script defer async src="https://www.googletagmanager.com/gtag/js?id=UA-113151733-4"></script>
        <script>
            window.dataLayer = window.dataLayer || [];

            function gtag() {
                dataLayer.push(arguments);
            }

            gtag('js', new Date());
            gtag('config', 'UA-113151733-4');
        </script>

        <!-- required static style for the critical page and the enable javascript page -->
        <style>
            .fulloverlay {
                z-index: 10000;
                display: none;
                position: fixed;

                top: 0;
                bottom: 0;
                left: 0;
                right: 0;

                background-color: gray;
                text-align: center;
            }

            .fulloverlay .container {
                position: relative;
                display: inline-block;

                top: 20%;
            }

            #critical-load.shown {
                display: block;
            }

            @media (max-height: 750px) {
                #critical-load .container {
                    top: unset;
                }

                #critical-load {
                    font-size: .8rem;

                    flex-direction: column;
                    justify-content: center;
                }

                #critical-load.shown {
                    display: flex;
                }
            }

            .no-js {
                display: block;
            }
        </style>
    </head>
    <body>
        <!-- No javascript error -->
        <noscript>
            <div class="fulloverlay no-js">
                <div class="container">
                    <img src="img/script.svg" height="128px">
                    <h1>Please enable JavaScript</h1>
                    <h3>TeaSpeak web could not run without it!</h3>
                    <h3>Its like you, without coffee</h3>
                </div>
            </div>
        </noscript>

        <!-- loader setup -->
        <div id="style">
            <link rel="stylesheet" href="css/loader/loader.css">
        </div>

        <meta name="app-loader-target" content="app">
        <div id="scripts">
            <script type="application/javascript" src="loader/loader_app.min.js" async defer></script>
            <script type="application/javascript" src="loader/loader_app.js" async defer></script>
            <script type="application/javascript" src="loader/loader.js?_<?php echo time() ?>" async defer></script>
        </div>

        <!-- Loading screen -->
        <div class="loader" id="loader-overlay">
            <div class="half right"></div>
            <div class="half left"></div>
            <div class="bookshelf_wrapper">
                <ul class="books_list">
                    <li class="book_item first"></li>
                    <li class="book_item second"></li>
                    <li class="book_item third"></li>
                    <li class="book_item fourth"></li>
                    <li class="book_item fifth"></li>
                    <li class="book_item sixth"></li>
                </ul>
                <div class="shelf"></div>
            </div>
        </div>

        <!-- Critical load error -->
        <div class="fulloverlay" id="critical-load">
            <div class="container">
                <img src="img/loading_error_right.svg" style="height: 12em">
                <h1 class="error" style="color: red; margin-bottom: 0"></h1>
                <h3 class="detail" style="margin-top: .5em"></h3>
            </div>
        </div>

        <!-- debugging close -->
<?php if($localhost && false) { ?>
        <div id="spoiler-style" style="z-index: 1000000; position: absolute; display: block; background: white; right: 5px; left: 5px; top: 34px;">
            <!-- <img src="https://www.chromatic-solutions.de/teaspeak/window/connect_opened.png"> -->
            <!-- <img src="http://puu.sh/DZDgO/9149c0a1aa.png"> -->
            <!-- <img src="http://puu.sh/E0QUb/ce5e3f93ae.png"> -->
            <!-- <img src="img/style/default.png"> -->
            <!-- <img src="img/style/user-selected.png"> -->
            <!-- <img src="img/style/privat_chat.png"> -->
            <!-- <img src="http://puu.sh/E1aBL/3c40ae3c2c.png"> -->
            <!-- <img src="http://puu.sh/E2qb2/b27bb2fde5.png"> -->
            <!-- <img src="http://puu.sh/E2UQR/1e0d7e03a3.png"> -->
            <!-- <img src="http://puu.sh/E38yX/452e27864c.png"> -->
            <!-- <img src="http://puu.sh/E3fjq/e2b4447bcd.png"> -->
            <!-- <img src="http://puu.sh/E3WlW/f791a9e7b1.png"> -->
            <!-- <img src="http://puu.sh/E4lHJ/1a4afcdf0b.png"> -->
            <!-- <img src="http://puu.sh/E4HKK/5ee74d4cc7.png"> -->
            <!-- <img src="http://puu.sh/E6LN1/8518c10898.png"> -->
            <!--
                http://puu.sh/E8IoF/242ed5ca3a.png
                http://puu.sh/E8Ip9/9632d33591.png
                http://puu.sh/E8Ips/6c314253e5.png
                http://puu.sh/E8IpG/015a38b184.png
                http://puu.sh/E8IpY/5be454a15e.png

                Identity imporve: http://puu.sh/E9jTp/380a734677.png
                Identity select: http://puu.sh/E9jYi/3003c58a2f.png

                Server Info Bandwidth: http://puu.sh/E9jTe/b41f6386de.png
                Server Info: http://puu.sh/E9jT6/302912ae34.png

                Bookmarks: http://puu.sh/Eb5w4/8d38fe5b8f.png

                serveredit_1.png https://www.hypixel-koo.cf/tsapoijdsadpoijsadsapj.png
                serveredit_2.png https://www.hypixel-koo.cf/tsandljsandljsamndoj3oiwejlkjmnlksandljsadmnlmsadnlsa.png
                serveredit_3.png https://www.hypixel-koo.cf/toiuhsadouhgdsapoiugdsapouhdsapouhdsaouhwouhwwouhwwoiuhwoihwwoihwoijhwwoknw.png

                Query accounts: https://puu.sh/EhvkJ/7551f548e3.png
                Channel info: https://puu.sh/EhuVH/1e21540589.png
            -->

            <!-- <img src="http://puu.sh/E6NXv/eb2f19c7c3.png"> -->
            <!-- <img src="http://puu.sh/E9jT6/302912ae34.png"> -->
            <!-- <img src="http://puu.sh/E9jTe/b41f6386de.png"> -->
            <!-- <img src="img/style/ban-list.png"> -->
            <!-- <img  src="http://puu.sh/E9jTe/b41f6386de.png"> -->
            <!-- <img src="https://puu.sh/EhuVH/1e21540589.png"> -->
            <img src="https://puu.sh/EhvkJ/7551f548e3.png">
        </div>
        <button class="toggle-spoiler-style" style="height: 30px; width: 100px; z-index: 100000000; position: absolute; bottom: 2px;">toggle style</button>
        <script>
            const init = (jQuery) => {
                if(typeof jQuery === "undefined") {
                    setTimeout(() => init($), 1000);
                    return;
                }
                jQuery("#spoiler-style").hide();
                jQuery(".toggle-spoiler-style").on('click', () => {
                    jQuery("#spoiler-style").toggle();
                });
            };
            setTimeout(() => init($), 1000);
        </script>
<?php } ?>
    </body>
</html>