<?php
	/**
	 * Created by PhpStorm.
	 * User: WolverinDEV
	 * Date: 04.10.18
	 * Time: 16:42
	 */

    $UI_BASE_PATH = "ui-files/";
    $CLIENT_BASE_PATH = "files/";

	function errorExit($message) {
		http_response_code(400);
		die(json_encode([
			"success" => false,
			"msg" => $message
		]));
	}

	function verifyPostSecret() {
        if(!isset($_POST["secret"])) {
            errorExit("Missing required information!");
        }

        $require_secret = file_get_contents(".deploy_secret");
        if($require_secret === false || strlen($require_secret) == 0) {
            errorExit("Server missing secret!");
        }

        if(!is_string($_POST["secret"])) {
            errorExit("Invalid secret!");
        }

        if(strcmp(trim($require_secret), trim($_POST["secret"])) !== 0) {
            errorExit("Secret does not match!");
        }
    }

	function handleRequest() {
		if(isset($_GET) && isset($_GET["type"])) {
			if ($_GET["type"] == "update-info") {
				global $CLIENT_BASE_PATH;
				$raw_versions = file_get_contents($CLIENT_BASE_PATH . "/version.json");
				if($raw_versions === false) {
                    errorExit("Missing file!");
                }

				$versions = json_decode($raw_versions, true);
				$versions["success"] = true;

				die(json_encode($versions));
			}
			else if ($_GET["type"] == "update-download") {
				global $CLIENT_BASE_PATH;

				$path = $CLIENT_BASE_PATH . $_GET["channel"] . DIRECTORY_SEPARATOR . $_GET["version"] . DIRECTORY_SEPARATOR;
				$raw_release_info = file_get_contents($path . "info.json");
				if($raw_release_info === false) {
                    errorExit("missing info file (version and/or channel missing. Path was " . $path . ")");
                }
				$release_info = json_decode($raw_release_info);

				foreach($release_info as $platform) {
					if($platform->platform != $_GET["platform"]) continue;
					if($platform->arch != $_GET["arch"]) continue;

					http_response_code(200);
					header("Cache-Control: public"); // needed for internet explorer
					header("Content-Type: application/binary");
					header("Content-Transfer-Encoding: Binary");
					header("Content-Length:".filesize($path . $platform->update));
					header("Content-Disposition: attachment; filename=update.tar.gz");
					header("info-version: 1");
					readfile($path . $platform->update);
					die();
				}
				errorExit("Missing platform, arch or file");
			}
			else if ($_GET["type"] == "ui-info") {
				global $UI_BASE_PATH;

				$version_info = file_get_contents($UI_BASE_PATH . "info.json");
				if($version_info === false) $version_info = array();
				else $version_info = json_decode($version_info, true);

				$info = array();
				$info["success"] = true;
				$info["versions"] = array();

				foreach($version_info as $channel => $data) {
					if(!isset($data["latest"])) continue;

					$channel_info = [
						"timestamp" => $data["latest"]["timestamp"],
						"version" => $data["latest"]["version"],
						"git-ref" => $data["latest"]["git-ref"],
						"channel" => $channel,
						"required_client" => $data["latest"]["required_client"]
					];
					array_push($info["versions"], $channel_info);
				}
				
				die(json_encode($info));
			} else if ($_GET["type"] == "ui-download") {
				global $UI_BASE_PATH;

				if(!isset($_GET["channel"]) || !isset($_GET["version"]))
					errorExit("missing required parameters");

				if($_GET["version"] !== "latest" && !isset($_GET["git-ref"]))
					errorExit("missing required parameters");

				$version_info = file_get_contents($UI_BASE_PATH . "info.json");
				if($version_info === false) $version_info = array();
				else $version_info = json_decode($version_info, true);

				$channel_data = $version_info[$_GET["channel"]];
				if(!isset($channel_data))
					errorExit("channel unknown");

				$ui_pack = false;
				if($_GET["version"] === "latest") {
					$ui_pack = $channel_data["latest"];
				} else {
					foreach ($channel_data["history"] as $entry) {
						if($entry["version"] == $_GET["version"] && $entry["git-ref"] == $_GET["git-ref"]) {
							$ui_pack = $entry;
							break;
						}
					}
				}
				if($ui_pack === false)
					errorExit("missing version");


				header("Cache-Control: public"); // needed for internet explorer
				header("Content-Type: application/binary");
				header("Content-Transfer-Encoding: Binary");
				header("Content-Disposition: attachment; filename=ui.tar.gz");
				header("info-version: 1");

				header("x-ui-timestamp: " . $ui_pack["timestamp"]);
				header("x-ui-version: " . $ui_pack["version"]);
				header("x-ui-git-ref: " . $ui_pack["git-ref"]);
				header("x-ui-required_client: " . $ui_pack["required_client"]);

				$read = readfile($ui_pack["file"]);
				header("Content-Length:" . $read);

				if($read === false) errorExit("internal error: Failed to read file!");
				die();
			}
		}
		else if($_POST["type"] == "deploy-build") {
			global $CLIENT_BASE_PATH;

			if(!isset($_POST["version"]) || !isset($_POST["platform"]) || !isset($_POST["arch"]) || !isset($_POST["update_suffix"]) || !isset($_POST["installer_suffix"])) {
                errorExit("Missing required information!");
			}

            verifyPostSecret();

			if(!isset($_FILES["update"])) {
                errorExit("Missing update file");
            }

			if($_FILES["update"]["error"] !== UPLOAD_ERR_OK) {
                errorExit("Upload for update failed!");
            }

			if(!isset($_FILES["installer"])) {
                errorExit("Missing installer file");
            }

			if($_FILES["installer"]["error"] !== UPLOAD_ERR_OK) {
                errorExit("Upload for installer failed!");
            }

			$json_version = json_decode($_POST["version"], true);
			$version = $json_version["major"] . "." . $json_version["minor"] . "." . $json_version["patch"] . ($json_version["build"] > 0 ? "-" . $json_version["build"] : "");
			$path = $CLIENT_BASE_PATH . DIRECTORY_SEPARATOR . $_POST["channel"] . DIRECTORY_SEPARATOR . $version . DIRECTORY_SEPARATOR;
			exec("mkdir -p " . $path);
			//mkdir($path, 777, true);


			$filename_update = "TeaClient-" . $_POST["platform"] . "_" . $_POST["arch"] . "." . $_POST["update_suffix"];
			$filename_install = "TeaClient-" . $_POST["platform"] . "_" . $_POST["arch"] . "." . $_POST["installer_suffix"];

			{
				$version_info = file_get_contents($path . "info.json");
				if($version_info === false) {
                    $version_info = array();
                } else {
                    $version_info = json_decode($version_info, true);
                    if($version_info === false) {
                        errorExit("Failed to decode old versions info file");
                    }
                }

				for($index = 0; $index < count($version_info); $index++) {
					if($version_info[$index]["platform"] == $_POST["platform"] && $version_info[$index]["arch"] == $_POST["arch"]) {
						array_splice($version_info, $index, 1);
						break;
					}
				}

				$info = array();
				$info["platform"] = $_POST["platform"];
				$info["arch"] = $_POST["arch"];
				$info["update"] = $filename_update;
				$info["install"] = $filename_install;
				array_push($version_info, $info);
				file_put_contents($path . "info.json", json_encode($version_info));
			}

			{
				$filename = $CLIENT_BASE_PATH . DIRECTORY_SEPARATOR . "version.json";
				$indexes = file_get_contents($filename);
				if($indexes === false) {
                    $indexes = array();
                } else {
                    $indexes = json_decode($indexes, true);
                    if($indexes === false) {
                        errorExit("Failed to decode old latest versions info file");
                    }
                }

				$index = &$indexes[$_POST["channel"]];
				if(!isset($index)) {
                    $index = array();
				}

				for($idx = 0; $idx < count($index); $idx++) {
					if($index[$idx]["platform"] == $_POST["platform"] && $index[$idx]["arch"] == $_POST["arch"]) {
						array_splice($index, $idx, 1);
						break;
					}
				}

				$info = array();
				$info["platform"] = $_POST["platform"];
				$info["arch"] = $_POST["arch"];
				$info["version"] = $json_version;
				array_push($index, $info);

				file_put_contents($filename, json_encode($indexes));
			}

			move_uploaded_file($_FILES["installer"]["tmp_name"],$path . $filename_install);
			move_uploaded_file($_FILES["update"]["tmp_name"],$path . $filename_update);

			die(json_encode([
				"success" => true
			]));
		}
		else if($_POST["type"] == "deploy-ui-build") {
			global $UI_BASE_PATH;

			if(!isset($_POST["channel"]) || !isset($_POST["version"]) || !isset($_POST["git_ref"]) || !isset($_POST["required_client"])) {
                errorExit("Missing required information!");
			}

            verifyPostSecret();

			$path = $UI_BASE_PATH . DIRECTORY_SEPARATOR;
			$channeled_path = $UI_BASE_PATH . DIRECTORY_SEPARATOR . $_POST["channel"];
			$filename = "TeaClientUI-" . $_POST["version"] . "_" . $_POST["git_ref"] . ".tar.gz";
			exec("mkdir -p " . $path);
			exec("mkdir -p " . $channeled_path);

			{
				$info = file_get_contents($path . "info.json");
				if($info === false) {
                    $info = array();
                } else {
                    $info = json_decode($info, true);
                    if($info === false) {
                        errorExit("failed to decode old info file");
                    }
                }

				$channel_info = &$info[$_POST["channel"]];
				if(!$channel_info) {
                    $channel_info = array();
                }

				$entry = [
					"timestamp" => time(),
					"file" => $channeled_path . DIRECTORY_SEPARATOR . $filename,
					"version" => $_POST["version"],
					"git-ref" => $_POST["git_ref"],
					"required_client" => $_POST["required_client"]
				];

				$channel_info["latest"] = $entry;
				if(!$channel_info["history"]) $channel_info["history"] = array();
				array_push($channel_info["history"], $entry);

				file_put_contents($path . "info.json", json_encode($info));
			}


			move_uploaded_file($_FILES["file"]["tmp_name"],$channeled_path . DIRECTORY_SEPARATOR . $filename);
			die(json_encode([
				"success" => true
			]));
		}
		else die(json_encode([
			"success" => false,
			"error" => "invalid action!"
		]));
	}

	handleRequest();
