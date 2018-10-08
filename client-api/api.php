<?php
	/**
	 * Created by PhpStorm.
	 * User: WolverinDEV
	 * Date: 04.10.18
	 * Time: 16:42
	 */

	$UI_BASE_PATH = "ui-files/";

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

	function handle_develop_web_request() {
		global $UI_BASE_PATH;

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
			if($path === False || strpos($path, realpath(".")) === False || strpos($name, "/") !== False) die(json_encode([
				"success" => false,
				"error" => "invalid file!"
			]));

			if(!is_file( $path . DIRECTORY_SEPARATOR . $name)) {
				if(endsWith($name, ".html")) {
					$name = substr($name, 0, strlen($name) - 4);
					$name .= "php";
				}
			}
			if(!is_file( $path . DIRECTORY_SEPARATOR . $name))
				die(json_encode([
					"success" => false,
					"error" => "missing file!"
				]));

			fdump( $path . DIRECTORY_SEPARATOR . $name);
			die();
		} else if ($_GET["type"] == "update-info") {
			//TODO read real data from update/info.txt
			die(json_encode([
				"versions" => [
					[
						"channel" => "beta",
						"major" => 1,
						"minor" => 0,
						"patch" => 0,
						"build" => 0
					],
					[
						"channel" => "release",
						"major" => 1,
						"minor" => 0,
						"patch" => 0,
						"build" => 0
					]
				],
				"updater" => [
						"channel" => "release",
						"major" => 1,
						"minor" => 0,
						"patch" => 0,
						"build" => 0
				],
				"success" => true
			]));
		} else die(json_encode([
			"success" => false,
			"error" => "invalid action!"
		]));
	}

	handle_develop_web_request();