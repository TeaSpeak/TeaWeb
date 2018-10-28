<?php
	$testXF = false;

	$_INCLIDE_ONLY = true;
	if (file_exists('auth.php'))
		include_once('auth.php');
	else if (file_exists('auth/auth.php'))
		include_once('auth/auth.php');
	else {
		//die("Could not resolve auth.php!");
		function authPath()
		{
			return "";
		}

		function redirectOnInvalidSession()
		{
		}

		function logged_in() {
		    return false;
        }
	}
	$localhost |= gethostname() == "WolverinDEV";
	if (!$localhost || $testXF) {
		//redirectOnInvalidSession();
	}

	$WEB_CLIENT = http_response_code() !== false;
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <?php
            if(!$WEB_CLIENT) {
                echo "<title>TeaClient</title>";
            } else {
				echo "<title>TeaSpeak-Web</title>";
            }
        ?>

        <link rel="stylesheet" href="css/main.css" type="text/css">
        <link rel="stylesheet" href="css/helptag.css" type="text/css">
        <link rel="stylesheet" href="css/scroll.css" type="text/css">
        <link rel="stylesheet" href="css/ts/tab.css" type="text/css">
        <link rel="stylesheet" href="css/ts/chat.css" type="text/css">
        <link rel="stylesheet" href="css/ts/client.css" type="text/css">
        <link rel="stylesheet" href="css/ts/icons.css" type="text/css">
        <link rel="stylesheet" href="css/general.css" type="text/css">
        <link rel="stylesheet" href="css/modals.css" type="text/css">
        <link rel="stylesheet" href="css/modal-banlist.css" type="text/css">
        <link rel="stylesheet" href="css/modal-bancreate.css" type="text/css">
        <link rel="stylesheet" href="css/modal-settings.css" type="text/css">
        <link rel="stylesheet" href="css/loader.css" type="text/css">
        <link rel="stylesheet" href="css/music/info_plate.css" type="text/css">
        <link rel="stylesheet" href="css/frame/SelectInfo.css" type="text/css">
        <link rel="stylesheet" href="css/control_bar.css" type="text/css">
        <link rel="stylesheet" href="css/context_menu.css" type="text/css">
        <link rel="stylesheet" href="vendor/bbcode/xbbcode.css" type="text/css">
        <!-- https://localhost:9987/?forward_url=http%3A%2F%2Flocalhost%3A63344%2FWeb-Client%2Findex.php%3F_ijt%3D82b1uhmnh0a5l1n35nnjps5eid%26loader_ignore_age%3D1%26connect_default_host%3Dlocalhost%26default_connect_type%3Dforum%26default_connect_url%3Dtrue%26default_connect_type%3Dteamspeak%26default_connect_url%3Dlocalhost%253A9987 -->
        <!-- PHP generated properies -->
        <!-- localhost:63342/TeaSpeak-Web/index.php?_ijt=o48hmliefjoa8cer8v7mpl98pj&connect_default_host=192.168.43.141 -->
        <x-properties id="properties">
            <!-- <x-property key="" value=""/> -->
			<?php
				function spawnProperty($name, $value)
				{
					echo '<x-property key="' . $name . '" value="' . urlencode($value) . '"></x-property>';
				}

				spawnProperty('connect_default_host', $localhost ? "localhost" : "ts.TeaSpeak.de");
				spawnProperty('localhost_debug', $localhost ? "true" : "false");
				spawnProperty('forum_user_data', $_COOKIE[$GLOBALS["COOKIE_NAME_USER_DATA"]]);
				spawnProperty('forum_user_sign', $_COOKIE[$GLOBALS["COOKIE_NAME_USER_SIGN"]]);
				spawnProperty('forum_path', authPath());
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
        <script>
            //const exports = {};
        </script>
        <div id="scripts">
            <script type="application/javascript" src="js/load.js" defer></script>
        </div>
    </head>
    <body>
		<?php
            if(true) {
        ?>
        <!-- No javascript error -->
        <div style="display: block; position: fixed; top: 0px; bottom: 0px; left: 0px; right: 0px; background-color: gray; z-index: 1000; text-align: center;" class="no-js">
            <div style="position: relative; display: inline-block; top: 30%">
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
		<?php } ?>

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
        <div style="display: none; position: fixed; top: 0; bottom: 0; left: 0; right: 0; background-color: gray; z-index: 1000; text-align: center;" id="critical-load">
            <div style="position: relative; display: inline-block; top: 30%">
                <img src="img/script.svg" height="128px">
                <h1 style="color: red">Got some trouble while loading important files!</h1>
                <h3 class="detail"></h3>
            </div>
        </div>

        <div id="music-test"></div>
        <div id="templates"></div>
    </body>

	<?php
        if($WEB_CLIENT) {
			$TAG = "<footer>
                    <div class=\"container\" style=\"display: flex; flex-direction: row; align-content: space-between;\">
                        <div style=\"align-self: center; position: fixed; left: 5px;\">Open source on <a href=\"https://github.com/TeaSpeak/TeaSpeak-Web\" style=\"display: inline-block; position: relative\">github.com</a></div>
                        <div style=\"align-self: center;\">TeaSpeak Web client by WolverinDEV</div>
                        <div style=\"align-self: center; position: fixed; right: 5px;\">";

			if (logged_in()) {
				$TAG = $TAG . "<a href=\"" . "x" . "auth.php?type=logout\">logout</a>";
			} else {
				$TAG = $TAG . "<a href=\"" . "y" . "login.php\">Login</a> via the TeaSpeak forum.";
			}

			echo $TAG . "</div>
            </div>
        </footer>";
		}
    ?>
</html>