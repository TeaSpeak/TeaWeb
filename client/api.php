<?php
	/**
	 * Created by PhpStorm.
	 * User: WolverinDEV
	 * Date: 04.10.18
	 * Time: 16:42
	 */

	if(!isset($_SERVER['REQUEST_METHOD'])) {
		error_log("This is a web only script!");
		exit(1);
	}


	include "../files.php";
	function handle_develop_web_request() {
		if($_GET["type"] === "files") {
			header("Content-Type: text/plain");
			header("info-version: 1");
			header("mode: develop");

			echo ("type\thash\tpath\tname\n");
			foreach (find_files(0b10, "../") as $file) {
				echo $file->type . "\t" . $file->hash . "\t" . $file->path . "\t" . $file->name . "\n";
			}
			echo "html\t".sha1("main")."\t.\tindex.html\n";
			die;
		} else if($_GET["type"] === "file") {
			header("Content-Type: text/plain");

			$available_files = find_files(0b10, "../");
			foreach ($available_files as $entry) {
				if(($entry->path == $_GET["path"]) && ($entry->name == $_GET["name"])) {
					fdump($entry->local_path);
					die();
				}
			}
			if($_GET["name"] == "index.html") {
				global $CLIENT;
				$CLIENT = true;
				include "../index.php";
				die();
			}
			die(json_encode([
				"success" => false,
				"error" => "missing file!"
			]));
		} else die(json_encode([
			"success" => false,
			"error" => "invalid action!"
		]));
	}

	handle_develop_web_request();