<?php
	$APP_FILE_LIST = [
		[
			"type" => "html",
			"search-pattern" => "/^([a-zA-Z]+)\.html$/",
			"build-target" => "dev|rel",

			"path" => "./",
			"local-path" => "./"
		],
		[
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"search-exclude" => "/(.*\/)?workers\/.*/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./shared/js/"
		],
		[
			"type" => "js",
			"search-pattern" => "/WorkerCodec.js$/",
			"build-target" => "dev|rel",

			"path" => "js/workers/",
			"local-path" => "./shared/js/workers/"
		],
		[
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./shared/css/"
		],
		[
			"type" => "img",
			"search-pattern" => "/.*\.(svg|png)/",
			"build-target" => "dev|rel",

			"path" => "img/",
			"local-path" => "./shared/img/"
		],
		[
			"type" => "wasm",
			"search-pattern" => "/.*\.(wasm)/",
			"build-target" => "dev|rel",

			"path" => "wasm/",
			"local-path" => "./asm/generated/"
		],
		[ /* useless? */
			"type" => "js",
			"search-pattern" => "/.*\.(js)/",
			"build-target" => "dev|rel",

			"path" => "wasm/",
			"local-path" => "./asm/generated/"
		],

		/* vendors */
		[
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev|rel",

			"path" => "vendor/",
			"local-path" => "./vendor/"
		],
		[
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "vendor/",
			"local-path" => "./vendor/"
		],

		/* client specs */
		[
			"client-only" => true,
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./client/css/"
		],
		[
			"client-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js/",
			"build-target" => "dev|rel",

			"path" => "js/",
			"local-path" => "./client/js/"
		],

		/* web specs */
		[
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./web/js/"
		],
		[
			"web-only" => true,
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./web/css/"
		],
		[
			"web-only" => true,
			"type" => "html",
			"search-pattern" => "/.*\.(php|html)/",
			"build-target" => "dev|rel",

			"path" => "./",
			"local-path" => "./web/html/"
		],
		[
			/* "web-only" => true, */ //Currently client as well
			"type" => "html",
			"search-pattern" => "/.*\.(php|html)/",
			"search-exclude" => "/(files.php)/",
			"search-depth" => 1,
			"build-target" => "dev|rel",

			"path" => "./",
			"local-path" => "./"
		],
		[
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.(js)/",
			"build-target" => "rel",

			"path" => "./",
			"local-path" => "./generated/"
		],
		[
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/load.js/",
			"build-target" => "rel",

			"path" => "./js/",
			"local-path" => "./shared/js/"
		],
	];

	function list_dir($base_dir, $match = null, $depth = -1, &$results = array(), $dir = "") {
		if($depth == 0) return $results;

		$files = scandir($base_dir . $dir);

		foreach($files as $key => $value){
			$path = $base_dir.$dir.DIRECTORY_SEPARATOR.$value;
			if(!is_dir($path)) {
				if(!$match || preg_match($match, ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value))
					$results[] = ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value;
			} else if($value != "." && $value != "..") {
				list_dir($base_dir, $match, $depth - 1, $results, ($dir ? $dir.DIRECTORY_SEPARATOR : "").$value);
			}
		}

		return $results;
	}

	class AppFile {
		public $type;
		public $name;
		public $path;
		public $local_path;
		public $hash;
	}

	function find_files($flag = 0b11, $local_path_prefix = "./", $type = "dev") { //TODO Use cache here!
		global $APP_FILE_LIST;
		$result = [];

		foreach ($APP_FILE_LIST as $entry) {
			if(isset($entry["web-only"]) && $entry["web-only"] && ($flag & 0b01) == 0) continue;
			if(isset($entry["client-only"]) && $entry["client-only"] && ($flag & 0b10) == 0) continue;
			if(isset($entry["build-target"]) && array_search($type, explode("|", $entry["build-target"])) === false) continue;

			$entries = list_dir($local_path_prefix . $entry["local-path"], $entry["search-pattern"], isset($entry["search-depth"]) ? $entry["search-depth"] : -1);
			foreach ($entries as $f_entry) {
				if(isset($entry["search-exclude"]) && preg_match($entry["search-exclude"], $f_entry)) continue;
				$file = new AppFile;

				$idx_sep = strrpos($f_entry, DIRECTORY_SEPARATOR);
				$file->path = "./" . $entry["path"] . "/";
				if($idx_sep > 0) {
					$file->name = substr($f_entry, strrpos($f_entry, DIRECTORY_SEPARATOR) + 1);
					$file->path = $file->path . substr($f_entry, 0, strrpos($f_entry, DIRECTORY_SEPARATOR));
				} else {
					$file->name = $f_entry;
				}

				$file->local_path = $local_path_prefix . $entry["local-path"] . DIRECTORY_SEPARATOR . $f_entry;
				$file->type = $entry["type"];
				$file->hash = sha1_file($file->local_path);

				if(strlen($file->hash) > 0) {
					foreach ($result as $e)
						if($e->hash == $file->hash) goto ignore;
				}
				array_push($result, $file);
				ignore:
			}
		}

		return $result;
	}

	if(isset($_SERVER["argv"])) { //Executed by command line
		if(strpos(PHP_OS, "Linux") == -1) {
			error_log("Invalid operating system! Help tool only available under linux!");
			exit(1);
		}
		if(count($_SERVER["argv"]) < 2) {
			error_log("Invalid parameters!");
			goto help;
		}
		if($_SERVER["argv"][1] == "help") {
			help:
			echo "php " . $_SERVER["argv"][0] . " <type> <args...>" . PHP_EOL;
			echo "  generate <web/client> <dev/package>" . PHP_EOL;
			echo "  list <web/client> <dev/package>" . PHP_EOL;
			exit(1);
		} else if($_SERVER["argv"][1] == "list") {
			if(count($_SERVER["argv"]) < 3) {
				error_log("Invalid parameter count!");
				goto help;
			}

			echo ("type\thash\tpath\tname\n");
			foreach (find_files(0b10) as $file) {
				echo $file->type . "\t" . $file->hash . "\t" . $file->path . "\t" . $file->name . "\n";
			}
			echo "html\t".sha1("main")."\t.\tindex.html\n";
			return;
		} else if($_SERVER["argv"][1] == "generate") {
			$state = 0;

			$flagset = 0b00;
			$environment = "";
			$type = "dev";
			if($_SERVER["argv"][3] == "dev") {
				if ($_SERVER["argv"][2] == "web") {
					$flagset = 0b01;
					$environment = "web/dev-environment";
				} else if ($_SERVER["argv"][2] == "client") {
					$flagset = 0b10;
					$environment = "client-api/environment/ui-files/raw";
				} else {
					error_log("Invalid type!");
					goto help;
				}
			} else if($_SERVER["argv"][3] == "rel") {
				$type = "rel";
				if ($_SERVER["argv"][2] == "web") {
					$flagset = 0b01;
					$environment = "web/rel-environment";
				} else if ($_SERVER["argv"][2] == "client") {
					$flagset = 0b10;
					$environment = "client-api/environment/ui-files/raw";
				} else {
					error_log("Invalid type!");
					goto help;
				}
			} else {
				error_log("Invalid type!");
				goto help;
			}

			{
				exec($command = "rm -r " . $environment, $output, $state);
				exec($command = "mkdir -p " . $environment, $output, $state); if($state) goto handle_error;

				$files = find_files($flagset, "./", $type);
				$original_path = realpath(".");
				if(!chdir($environment)) {
					error_log("Failed to enter directory " . $environment . "!");
					exit(1);
				}

				foreach($files as $file) {
					if(!is_dir($file->path)) {
						exec($command = "mkdir -p " . $file->path, $output, $state);
						if($state) goto handle_error;
					}

					$parent_base = substr_count(realpath($file->path), DIRECTORY_SEPARATOR) - substr_count(realpath('.'), DIRECTORY_SEPARATOR);
					$parent_file = substr_count(realpath("."), DIRECTORY_SEPARATOR) - substr_count($original_path, DIRECTORY_SEPARATOR); //Current to parent
					$parent = $parent_base + $parent_file;

					$path = "";
					for($index = 0; $index < $parent; $index++)
						$path = $path  . "../";
					exec($command = "ln -s " . $path . $file->local_path . " " . $file->path, $output, $state);
					if($state) goto handle_error;
					echo $command . PHP_EOL;
				}
				if(!chdir($original_path)) {
					error_log("Failed to reset directory!");
					exit(1);
				}
				echo "Generated!" . PHP_EOL;
			}


			if ($_SERVER["argv"][2] == "client") {
				if(!chdir("client-api/environment")) {
					error_log("Failed to enter directory client-api/environment!");
					exit(1);
				}
				if(!is_dir("versions/beta"))
					exec($command = "mkdir -p versions/beta", $output, $state); if($state) goto handle_error;
				if(!is_dir("versions/stable"))
					exec($command = "mkdir -p versions/beta", $output, $state); if($state) goto handle_error;

				exec($command = "ln -s ../api.php ./", $output, $state); $state = 0; //Dont handle an error here!
				if($state) goto handle_error;
			}

			exit(0);
			handle_error:
			error_log("Failed to execute command '" . $command . "'!");
			error_log("Command returned code " . $state . ". Output: " . PHP_EOL);
			foreach ($output as $line)
				error_log($line);
			exit(1);
		}
	}