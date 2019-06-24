<?php
	/**
	 * Created by PhpStorm.
	 * User: WolverinDEV
	 * Date: 04.10.18
	 * Time: 16:42
	 */

	$UI_BASE_PATH = "ui-files/";
	$UI_RAW_BASE_PATH = "ui-files/raw/";
	$CLIENT_BASE_PATH = "files/";

	if(!isset($_SERVER['REQUEST_METHOD'])) {
		error_log("This is a web only script!");
		exit(1);
	}

	function list_dir($base_dir, &$results = array(), $dir = "") {
		$files = scandir($base_dir . $dir);

		foreach($files as $key => $value){
			$path = $base_dir.$dir.DIRECTORY_SEPARATOR.$value;
			if(!is_dir($path)) {
				$results[] = ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value;
			} else if($value != "." && $value != "..") {
				list_dir($base_dir, $results, ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value);
			}
		}

		return $results;
	}

	function endsWith($haystack, $needle) {
		// search forward starting from end minus needle length characters
		if ($needle === '') {
			return true;
		}
		$diff = \strlen($haystack) - \strlen($needle);
		return $diff >= 0 && strpos($haystack, $needle, $diff) !== false;
	}

	function fdump($name) {
		if(endsWith($name, ".php")) {
			global $CLIENT;
			$CLIENT = true;

			include $name;
			return;
		}
		$file = fopen($name, "r") or error_exit("missing file \"" . $name . "\".");

		echo (fread($file, filesize($name)));
		fclose($file);
	}

	function error_exit($message) {
		http_response_code(400);
		die(json_encode([
			"success" => false,
			"msg" => $message
		]));
	}

	function handle_develop_web_request() {
		global $UI_RAW_BASE_PATH;

		if(isset($_GET) && isset($_GET["type"])) {
			if($_GET["type"] === "files") {
				header("Content-Type: text/plain");
				header("info-version: 1");
				/* header("mode: develop"); */

				echo ("type\thash\tpath\tname\n");
				foreach (list_dir($UI_RAW_BASE_PATH) as $file) {
					$type_idx = strrpos($file, ".");
					$type = $type_idx > 0 ? substr($file, $type_idx + 1) : "";
					if($type == "php") $type = "html";

					$name_idx = strrpos($file, "/");
					$name = $name_idx > 0 ? substr($file, $name_idx + 1) : $file;
					$path = $name_idx > 0 ? substr($file, 0, $name_idx) : ".";

					$name_idx = strrpos($name, ".");
					if($name_idx > 0)
						$name = substr($name, 0, $name_idx);

					echo $type . "\t" . sha1_file($UI_RAW_BASE_PATH . $file) . "\t" . $path . "\t" . $name . (strlen($type) > 0 ? "." . $type : "") . "\n";
				}
				die;
			}
			else if($_GET["type"] === "file") {
				header("Content-Type: text/plain");

				$path = realpath($UI_RAW_BASE_PATH . $_GET["path"]);
				$name = $_GET["name"];
				if($path === False || strpos($path, realpath(".")) === False || strpos($name, "/") !== False) error_exit("Invalid file");

				if(!is_file( $path . DIRECTORY_SEPARATOR . $name)) {
					if(endsWith($name, ".html")) {
						$name = substr($name, 0, strlen($name) - 4);
						$name .= "php";
					}
				}
				if(!is_file( $path . DIRECTORY_SEPARATOR . $name)) error_exit("Missing file");

				fdump( $path . DIRECTORY_SEPARATOR . $name);
				die();
			}
			else if ($_GET["type"] == "update-info") {
				global $CLIENT_BASE_PATH;
				$raw_versions = file_get_contents($CLIENT_BASE_PATH . "/version.json");
				if($raw_versions === false) error_exit("Missing file!");

				$versions = json_decode($raw_versions, true);
				$versions["success"] = true;

				die(json_encode($versions));
			}
			else if ($_GET["type"] == "update-download") {
				global $CLIENT_BASE_PATH;

				$path = $CLIENT_BASE_PATH . $_GET["channel"] . DIRECTORY_SEPARATOR . $_GET["version"] . DIRECTORY_SEPARATOR;
				$raw_release_info = file_get_contents($path . "info.json");
				if($raw_release_info === false) error_exit("missing info file (version and/or channel missing. Path was " . $path . ")");
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
				error_exit("Missing platform, arch or file");
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
					error_exit("missing required parameters");

				if($_GET["version"] !== "latest" && !isset($_GET["git-ref"]))
					error_exit("missing required parameters");

				$version_info = file_get_contents($UI_BASE_PATH . "info.json");
				if($version_info === false) $version_info = array();
				else $version_info = json_decode($version_info, true);

				$channel_data = $version_info[$_GET["channel"]];
				if(!isset($channel_data))
					error_exit("channel unknown");

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
					error_exit("missing version");


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

				if($read === false) error_exit("internal error: Failed to read file!");
				die();
			}
		}
		else if($_POST["type"] == "deploy-build") {
			global $CLIENT_BASE_PATH;

			if(!isset($_POST["secret"]) || !isset($_POST["version"]) || !isset($_POST["platform"]) || !isset($_POST["arch"]) || !isset($_POST["update_suffix"]) || !isset($_POST["installer_suffix"]))
				error_exit("Missing required information!");

			{
				$require_secret = file_get_contents(".deploy_secret");
				if($require_secret === false || strlen($require_secret) == 0) error_exit("Server missing secret!");

				if(!is_string($_POST["secret"])) error_exit("Invalid secret!");
				if(strcmp(trim($require_secret), trim($_POST["secret"])) !== 0)
					error_exit("Secret does not match!");
			}

			if(!isset($_FILES["update"])) error_exit("Missing update file");
			if($_FILES["update"]["error"] !== UPLOAD_ERR_OK) error_exit("Upload for update failed!");
			if(!isset($_FILES["installer"])) error_exit("Missing installer file");
			if($_FILES["installer"]["error"] !== UPLOAD_ERR_OK) error_exit("Upload for installer failed!");

			$json_version = json_decode($_POST["version"], true);
			$version = $json_version["major"] . "." . $json_version["minor"] . "." . $json_version["patch"] . ($json_version["build"] > 0 ? "-" . $json_version["build"] : "");
			$path = $CLIENT_BASE_PATH . DIRECTORY_SEPARATOR . $_POST["channel"] . DIRECTORY_SEPARATOR . $version . DIRECTORY_SEPARATOR;
			exec("mkdir -p " . $path);
			//mkdir($path, 777, true);


			$filename_update = "TeaClient-" . $_POST["platform"] . "_" . $_POST["arch"] . "." . $_POST["update_suffix"];
			$filename_install = "TeaClient-" . $_POST["platform"] . "_" . $_POST["arch"] . "." . $_POST["installer_suffix"];

			{
				$version_info = file_get_contents($path . "info.json");
				if($version_info === false) $version_info = array();
				else $version_info = json_decode($version_info, true);

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
				if($indexes === false) $indexes = array();
				else $indexes = json_decode($indexes, true);

				$index = &$indexes[$_POST["channel"]];
				if(!isset($index))
					$index = array();

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

			if(!isset($_POST["secret"]) || !isset($_POST["channel"]) || !isset($_POST["version"]) || !isset($_POST["git_ref"]) || !isset($_POST["required_client"]))
				error_exit("Missing required information!");

			$path = $UI_BASE_PATH . DIRECTORY_SEPARATOR;
			$channeled_path = $UI_BASE_PATH . DIRECTORY_SEPARATOR . $_POST["channel"];
			$filename = "TeaClientUI-" . $_POST["version"] . "_" . $_POST["git_ref"] . ".tar.gz";
			exec("mkdir -p " . $path);
			exec("mkdir -p " . $channeled_path);

			{
				$require_secret = file_get_contents(".deploy_secret");
				if($require_secret === false || strlen($require_secret) == 0) error_exit("Server missing secret!");

				error_log($_POST["secret"]);
				error_log(trim($require_secret));
				if(!is_string($_POST["secret"])) error_exit("Invalid secret!");
				if(strcmp(trim($require_secret), trim($_POST["secret"])) !== 0)
					error_exit("Secret does not match!");
			}
			{
				$info = file_get_contents($path . "info.json");
				if($info === false) $info = array();
				else $info = json_decode($info, true);

				$channel_info = &$info[$_POST["channel"]];
				if(!$channel_info) $channel_info = array();

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

	handle_develop_web_request();
