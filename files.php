<?php
	/* this file generates the final environment. All files have to be compiled before! */
	$APP_FILE_LIST = [
		/* shared part */
		[ /* shared html and php files */
			"type" => "html",
			"search-pattern" => "/^([a-zA-Z]+)\.(html|php)$/",
			"build-target" => "dev|rel",

			"path" => "./",
			"local-path" => "./shared/html/"
		],
		[ /* shared javascript files (development mode only) */
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"search-exclude" => "/(.*\/)?workers\/.*/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./shared/js/"
		],
		[ /* shared generated worker codec */
			"type" => "js",
			"search-pattern" => "/WorkerCodec.js$/",
			"build-target" => "dev|rel",

			"path" => "js/workers/",
			"local-path" => "./shared/js/workers/"
		],
		[ /* shared css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./shared/css/"
		],
		[ /* shared sound files */
			"type" => "wav",
			"search-pattern" => "/.*\.wav$/",
			"build-target" => "dev|rel",

			"path" => "audio/",
			"local-path" => "./shared/audio/"
		],
		[ /* shared data sound files */
			"type" => "json",
			"search-pattern" => "/.*\.json/",
			"build-target" => "dev|rel",

			"path" => "audio/",
			"local-path" => "./shared/audio/"
		],
		[ /* shared image files */
			"type" => "img",
			"search-pattern" => "/.*\.(svg|png)/",
			"build-target" => "dev|rel",

			"path" => "img/",
			"local-path" => "./shared/img/"
		],
		[ /* generated assembly files */
			"type" => "wasm",
			"search-pattern" => "/.*\.(wasm)/",
			"build-target" => "dev|rel",

			"path" => "wasm/",
			"local-path" => "./asm/generated/"
		],
		[ /* generated assembly javascript files */
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

		/* client specific */
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

		/* web specific */
		[ /* web javascript files (development mode only) */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./web/js/"
		],
		[ /* web merged javascript files (shared inclusive) */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "rel",

			"path" => "js/",
			"local-path" => "./web/generated/"
		],
		[ /* Add the shared generated files. Exclude the shared file because we're including it already */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"search-exclude" => "/shared\.js(.map)?$/",
			"build-target" => "rel",

			"path" => "js/",
			"local-path" => "./shared/generated/"
		],
		[ /* web css files */
			"web-only" => true,
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./web/css/"
		],
		[ /* web html files */
			"web-only" => true,
			"type" => "html",
			"search-pattern" => "/.*\.(php|html)/",
			"build-target" => "dev|rel",

			"path" => "./",
			"local-path" => "./web/html/"
		],



		/* special web.teaspeak.de only auth files */
		[ /* login page and api */
			"web-only" => true,
			"type" => "html",
			"search-pattern" => "/.*\.(php|html)/",
			"build-target" => "dev|rel",
			"search-depth" => 1,

			"path" => "./",
			"local-path" => "./auth/"
		],
		[ /* javascript  */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev|rel",

			"path" => "js/",
			"local-path" => "./auth/js/"
		],
		[ /* web css files */
			"web-only" => true,
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./auth/css/"
		],
		[ /* certificates */
			"web-only" => true,
			"type" => "pem",
			"search-pattern" => "/.*\.pem$/",
			"build-target" => "dev|rel",

			"path" => "certs/",
			"local-path" => "./auth/certs/"
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
			if($_SERVER["argv"][3] == "dev" || $_SERVER["argv"][3] == "development") {
				if ($_SERVER["argv"][2] == "web") {
					$flagset = 0b01;
					$environment = "web/environment/development";
				} else if ($_SERVER["argv"][2] == "client") {
					$flagset = 0b10;
					$environment = "client-api/environment/ui-files/raw";
				} else {
					error_log("Invalid type!");
					goto help;
				}
			} else if($_SERVER["argv"][3] == "rel" || $_SERVER["argv"][3] == "release") {
				$type = "rel";
				if ($_SERVER["argv"][2] == "web") {
					$flagset = 0b01;
					$environment = "web/environment/release";
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

			{
				exec("./scripts/git_index.sh sort-tag", $output, $state);
				file_put_contents($environment . DIRECTORY_SEPARATOR . "version", $output);
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