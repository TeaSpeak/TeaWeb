<?php
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);

	$WEB_CLIENT = http_response_code() !== false;
?>
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <!-- App min width: 450px -->
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, min-zoom=1, max-zoom: 1, user-scalable=no">
        <meta name="description" content="TeaSpeak Web Client, connect to any TeaSpeak server without installing anything." />
        <meta name="keywords" content="TeaSpeak, TeaWeb, TeaSpeak-Web,Web client TeaSpeak, веб клієнт TeaSpeak, TSDNS, багатомовність, мультимовність, теми, функціонал"/>
        <!-- TODO Needs some fix -->
        <link rel="manifest" href="manifest.json">

        <?php
            if(!$WEB_CLIENT) {
                echo "<title>TeaClient</title>";
            } else {
				echo "<title>TeaSpeak-Web</title>";
				echo '<link rel="icon" href="img/favicon/teacup.png" type="image/x-icon">';
            }
        ?>

        <!-- PHP generated properties -->
        <x-properties id="properties">
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

        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=UA-113151733-4"></script>
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
                top: 30%;

                max-width: unset!important; /* override bootstrap */
            }

            .no-js {
                display: block;
            }
        </style>

        <div id="style">
            <link rel="stylesheet" href="css/loader/loader.css">
        </div>
        <div id="scripts">
            <script type="application/javascript" src="js/load.js" defer></script>
        </div>
    </head>
    <body>
        <!-- No javascript error -->
        <div class="fulloverlay no-js">
            <div class="container">
                <img src="img/script.svg" height="128px">
                <h1>Please enable JavaScript</h1>
                <h3>TeaSpeak web could not run without it!</h3>
                <h3>Its like you, without coffee</h3>
            </div>
        </div>
        <script type="text/javascript" class="no-js">
            let elements = document.getElementsByClassName("no-js");
            while (elements.length > 0) //Removing these elements (even self)
                elements.item(0).remove();
        </script>

        <!-- Loading screen -->
        <div class="loader">
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
                <img src="img/loading_error_right.svg" height="192px">
                <h1 class="error" style="color: red">Ooops, we encountered some trouble while loading important files!</h1>
                <h3 class="detail"></h3>
            </div>
        </div>

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

            <img src="http://puu.sh/E6NXv/eb2f19c7c3.png">
        </div>
        <button class="toggle-spoiler-style" style="height: 30px; width: 100px; z-index: 100000000; position: absolute; bottom: 2px;">toggle style</button>
        <script>
            setTimeout(() => {
                $("#spoiler-style").hide();
                $(".toggle-spoiler-style").on('click', () => {
                    $("#spoiler-style").toggle();
                });
            }, 2500);
        </script>

        <div id="music-test"></div>
        <div id="templates"></div>
        <div id="sounds"></div>
        <div id="mouse-move">
            <div class="container">
            </div>
        </div>
        <div id="global-tooltip">
            <a></a>
        </div>
    </body>

    <div id="top-menu-bar"></div>
</html>