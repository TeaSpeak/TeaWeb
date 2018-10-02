<?php

	$APP_FILE_LIST = [ ];
	$APP_FILE_ROOT = [
		"js" => "../js/",
		"css" => "../css/",
		"vendor" => "../"
	];

	function list_dir($base_dir, $match = null, &$results = array(), $dir = "") {
		$files = scandir($base_dir . $dir);

		foreach($files as $key => $value){
			$path = $base_dir.$dir.DIRECTORY_SEPARATOR.$value;
			if(!is_dir($path)) {
				if(!$match || preg_match($match, $path))
					$results[] = ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value;
			} else if($value != "." && $value != "..") {
				list_dir($base_dir, $match, $results, ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value);
			}
		}

		return $results;
	}

	function files_css() {
		global $APP_FILE_ROOT;
		return list_dir($APP_FILE_ROOT["css"], "/.*\.css$/");
	}

	function files_js() {
		global $APP_FILE_ROOT;
		return list_dir($APP_FILE_ROOT["js"], "/.*\.js$/");
	}

	function vendor() {
		return ["vendor/jquery/jquery.min.js", "vendor/bbcode/xbbcode.js", "vendor/jsrender/jsrender.min.js", "asm/generated/TeaWeb-Identity.js"];
	}

	function fdump($name) {
		$file = fopen($name, "r") or die(json_encode([
			"success" => false,
			"error" => "missing file (" . $name . ")"
		]));

		echo (fread($file, filesize($name)));
		fclose($file);
	}

	error_log("XXX: ");
	if($_GET["type"] === "files") {
		header("Content-Type: text/plain");
		header("info-version: 1");
		foreach(files_js() as $file) {
			echo $file . "\t" . sha1_file($APP_FILE_ROOT["js"] . DIRECTORY_SEPARATOR . $file) . "\n";
		}
		foreach(files_css() as $file) {
			echo $file . "\t" . sha1_file($APP_FILE_ROOT["css"] . DIRECTORY_SEPARATOR . $file) . "\n";
		}
		foreach(vendor() as $file) {
			echo $file . "\t" . sha1_file($APP_FILE_ROOT["vendor"] . DIRECTORY_SEPARATOR . $file) . "\n";
		}
		echo "main\t".sha1("main");
		die;
	} else if($_GET["type"] === "file") {
		error_log("XXX: " . $_GET["name"]);
		if($_GET["name"] == "main") {
			global $CLIENT;
			$CLIENT = true;
			include("../index.php");
		} else {
			foreach(files_css() as $file) {
				if($file == $_GET["name"]) {
					fdump($APP_FILE_ROOT["css"] . $_GET["name"]); //FIXME test path!
					die();
				}
			}
			foreach(files_js() as $file) {
				if($file == $_GET["name"]) {
					fdump($APP_FILE_ROOT["js"] . $_GET["name"]); //FIXME test path!
					die();
				}
			}

			fdump('../' . $_GET["name"]); //FIXME remove this!
		}
		die();
	} else die(json_encode([
		"success" => false,
		"error" => "invalid action!"
	]));