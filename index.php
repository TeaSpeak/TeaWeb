<?php
	$testXF = false;


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

		$localhost = true;
	}
	$localhost |= gethostname() == "WolverinDEV";
	if (!$localhost || $testXF) {
		//redirectOnInvalidSession();
	}
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>TeaSpeak-Web</title>

        <link rel="stylesheet" href="css/scroll.css" type="text/css">
        <link rel="stylesheet" href="css/ts/tab.css" type="text/css">
        <link rel="stylesheet" href="css/ts/chat.css" type="text/css">
        <link rel="stylesheet" href="css/ts/client.css" type="text/css">
        <link rel="stylesheet" href="css/ts/icons.css" type="text/css">
        <link rel="stylesheet" href="css/general.css" type="text/css">
        <link rel="stylesheet" href="css/modals.css" type="text/css">
        <link rel="stylesheet" href="css/loader.css" type="text/css">
        <link rel="stylesheet" href="css/music/info_plate.css" type="text/css">
        <link rel="stylesheet" href="css/frame/SelectInfo.css" type="text/css">
        <link rel="stylesheet" href="css/control_bar.css" type="text/css">
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
        <script src="vendor/jquery/jquery.min.js"></script>
        <div id="scripts">
            <script type="application/javascript" src="js/load.js" defer></script>
        </div>
    </head>
    <body>
        <!-- No javascript error -->
        <div style="display: block; position: fixed; top: 0px; bottom: 0px; left: 0px; right: 0px; background-color: gray; z-index: 1000; text-align: center;"
             class="no-js">
            <div style="position: relative; display: inline-block; top: 30%">
                <img src="img/script.svg" height="128px">
                <h1>Please enable JavaScript</h1>
                <h3>TeaSpeak web could not run without it!</h3>
                <h3>Its like you, without coffee</h3>
            </div>
        </div>
        <script type="text/javascript" class="no-js">
            var elements = document.getElementsByClassName("no-js");
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
        <div style="display: none; position: fixed; top: 0px; bottom: 0px; left: 0px; right: 0px; background-color: gray; z-index: 1000; text-align: center;"
             id="critical-load">
            <div style="position: relative; display: inline-block; top: 30%">
                <img src="img/script.svg" height="128px">
                <h1 style="color: red">Got some trouble while loading important files!</h1>
                <h3 class="detail"></h3>
            </div>
        </div>

        <!-- -->
        TeaSpeak-Web<br>

        <div style="width: 100%; display: flex; justify-content: center">
            <div style="width: 1200px; height: 900px; display: flex; flex-direction: column; resize: both; margin: 20px">
                <!-- Container -->
                <div style="height: 45px; width: 100%; border-radius: 2px 0px 0px 0px; border-bottom-width: 0px; background-color: lightgrey"
                     class="main_container">
                    <div id="control_bar" class="control_bar">
                        <div class="button btn_connect" title="Connect to a server">
                            <div class="icon_x32 client-connect"></div>
                        </div>
                        <div class="button btn_disconnect" title="Disconnect from server" style="display: none">
                            <div class="icon_x32 client-disconnect"></div>
                        </div>
                        <!--<div class="button btn_disconnect"><div class="icon_x32 client-disconnect"></div></div>-->
                        <div class="divider"></div>

                        <div class="button-dropdown btn_away" title="Toggle away status">
                            <div class="buttons">
                                <div class="button icon_x32 client-away btn_away_toggle"></div>
                                <div class="button-dropdown">
                                    <div class="arrow"></div>
                                </div>
                            </div>
                            <div class="dropdown">
                                <div class="btn_away_toggle"><div class="icon client-away"></div><a>Toggle away status</a></div>vendor/jquery/jquery.min.js
                                <div class="btn_away_message"><div class="icon client-away"></div><a>Set away message</a></div>
                            </div>
                        </div>
                        <div class="button btn_mute_input">
                            <div class="icon_x32 client-input_muted" title="Mute/unmute microphone"></div>
                        </div>
                        <div class="button btn_mute_output">
                            <div class="icon_x32 client-output_muted" title="Mute/unmute headphones"></div>
                        </div>
                        <div class="divider"></div>

                        <div class="button-dropdown btn_token" title="Use token">
                            <div class="buttons">
                                <div class="button icon_x32 client-token btn_token_use"></div>
                                <div class="button-dropdown">
                                    <div class="arrow"></div>
                                </div>
                            </div>
                            <div class="dropdown">
                                <div class="btn_token_list"><div class="icon client-token"></div><a>List tokens</a></div>
                                <div class="btn_token_use"><div class="icon client-token_use"></div><a>Use token</a></div>
                            </div>
                        </div>

                        <div style="width: 100%"></div>
                        <div class="button btn_permissions" title="View/edit permissions">
                            <div class="icon_x32 client-permission_overview"></div>
                        </div>
                        <div class="divider"></div>
                        <div class="button btn_open_settings" title="Edit global client settings">
                            <div class="icon_x32 client-settings"></div>
                        </div>
                    </div>
                </div>

                <div style="flex-direction: row; height: 100%; width: 100%; display: flex">
                    <div style="width: 60%; flex-direction: column;">
                        <div style="height: 60%; border-radius: 0px 0px 0px 0px; border-right-width: 0px; overflow: auto; overflow-x: visible"
                             class="main_container">
                            <div class="channelTree" id="channelTree"></div>
                        </div> <!-- Channel tree -->
                        <div style="height: 40%; border-radius: 0px 0px 0px 2px; border-top-width: 0px; border-right-width: 0px;"
                             class="main_container">
                            <div id="chat">
                                <div class="messages">
                                    <div class="message_box"></div>
                                </div>
                                <div class="chats"></div>
                                <div class="input">
                                    <!--<div contentEditable="true" class="input_box"></div>-->
                                    <textarea class="input_box" title=""></textarea>
                                    <button>Send</button>
                                </div>
                            </div>
                        </div> <!-- Chat window -->
                    </div>
                    <div style="width: 40%; border-radius: 0px 0px 2px 0px;" class="main_container">
                        <div id="select_info" class="select_info" style="width: 100%; max-width: 100%">
                        </div>
                    </div> <!-- Selection info -->
                </div>
            </div>
        </div>
        <div id="contextMenu" class="contextMenu"></div>

        <!--
        <div style="background-color:white;">
            <div style=" color: white; mix-blend-mode: difference;">And stay alive... XXXXXXX</div>
        </div>
        -->

        <div id="templates"></div>
        <div id="music-test"></div>
        <div style="height: 100px"></div>
    </body>
    <footer>
        <div class="container" style="display: flex; flex-direction: row; align-content: space-between;">
            <div style="align-self: center; position: fixed; left: 5px;">Open source on <a href="https://github.com/TeaSpeak/TeaSpeak-Web" style="display: inline-block; position: relative">github.com</a></div>
            <div style="align-self: center;">TeaSpeak Web client by WolverinDEV</div>
            <div style="align-self: center; position: fixed; right: 5px;">
                <?php
                    if(logged_in()) {
						?> <a href="<?php echo authPath() . "auth.php?type=logout"; ?>">logout</a> <?php
                    } else {
                        ?> <a href="<?php echo authPath() . "login.php"; ?>">Login</a> via the TeaSpeak forum. <?php
                    }
                ?>
            </div>
        </div>
    </footer>
</html>