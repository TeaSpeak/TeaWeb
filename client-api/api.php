<?php
	/**
	 * Created by PhpStorm.
	 * User: WolverinDEV
	 * Date: 04.10.18
	 * Time: 16:42
	 */

	$UI_BASE_PATH = "ui-files/";
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
		$file = fopen($name, "r") or die(json_encode([
			"success" => false,
			"error" => "missing file (" . $name . ")"
		]));

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
		global $UI_BASE_PATH;

		if(isset($_GET) && isset($_GET["type"])) {
			if($_GET["type"] === "files") {
				header("Content-Type: text/plain");
				header("info-version: 1");
				/* header("mode: develop"); */

				echo ("type\thash\tpath\tname\n");
				foreach (list_dir($UI_BASE_PATH) as $file) {
					$type_idx = strrpos($file, ".");
					$type = substr($file, $type_idx + 1);
					if($type == "php") $type = "html";

					$name_idx = strrpos($file, "/");
					$name = $name_idx > 0 ? substr($file, $name_idx + 1) : $file;
					$path = $name_idx > 0 ? substr($file, 0, $name_idx) : ".";

					$name_idx = strrpos($name, ".");
					$name = substr($name, 0, $name_idx);

					echo $type . "\t" . sha1_file($UI_BASE_PATH . $file) . "\t" . $path . "\t" . $name . "." . $type . "\n";
				}
				die;
			} else if($_GET["type"] === "file") {
				header("Content-Type: text/plain");

				$path = realpath($UI_BASE_PATH . $_GET["path"]);
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
			} else if ($_GET["type"] == "update-info") {
				global $CLIENT_BASE_PATH;
				$raw_versions = file_get_contents($CLIENT_BASE_PATH . "/version.json");
				if($raw_versions === false) error_exit("Missing file!");

				$versions = json_decode($raw_versions, true);
				$versions["success"] = true;

				die(json_encode($versions));
			} else if ($_GET["type"] == "update-download") {
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
					readfile($path . $platform->update);
					die();
				}
				error_exit("Missing platform, arch or file");
			}
		} else if($_POST["type"] == "deploy-build") {
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
			$version = $json_version["major"] . "." . $json_version["minor"] . "." . $json_version["patch"] . ($json_version["build"] > 0 ? $json_version["build"] : "");
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
		} else die(json_encode([
			"success" => false,
			"error" => "invalid action!"
		]));
	}

	handle_develop_web_request();
