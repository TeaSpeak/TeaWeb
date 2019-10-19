<?php
	/* this file generates the final environment. All files have to be compiled before! */
	$APP_FILE_LIST_SHARED_SOURCE = [
		[ /* shared html and php files */
			"type" => "html",
			"search-pattern" => "/^([a-zA-Z]+)\.(html|php|json)$/",
			"build-target" => "dev|rel",

			"path" => "./",
			"local-path" => "./shared/html/"
		],

		[ /* javascript loader */
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev",

			"path" => "loader/",
			"local-path" => "./shared/loader/"
		],
		[ /* javascript loader for releases */
			"type" => "js",
			"search-pattern" => "/.*loader_[\S]+.min.js$/",
			"build-target" => "rel",

			"path" => "loader/",
			"local-path" => "./shared/generated/"
		],

		[ /* shared javascript files (WebRTC adapter) */
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev|rel",

			"path" => "adapter/",
			"local-path" => "./shared/adapter/"
		],

		[ /* shared javascript files (development mode only) */
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"search-exclude" => "/(.*\/)?workers\/.*/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./shared/js/"
		],
		[ /* shared javascript mapping files (development mode only) */
			"type" => "js",
			"search-pattern" => "/.*\.(js.map|ts)$/",
			"search-exclude" => "/(.*\/)?workers\/.*/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./shared/js/",
			"req-parm" => ["--mappings"]
		],

		[ /* shared generated worker codec */
			"type" => "js",
			"search-pattern" => "/(WorkerPOW.js)$/",
			"build-target" => "dev|rel",

			"path" => "js/workers/",
			"local-path" => "./shared/js/workers/"
		],
		[ /* shared developer single css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev",

			"path" => "css/",
			"local-path" => "./shared/css/"
		],
		[ /* shared css mapping files (development mode only) */
			"type" => "css",
			"search-pattern" => "/.*\.(css.map|scss)$/",
			"build-target" => "dev",

			"path" => "css/",
			"local-path" => "./shared/css/",
			"req-parm" => ["--mappings"]
		],
		[ /* shared release css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "rel",

			"path" => "css/",
			"local-path" => "./shared/generated/"
		],
		[ /* shared release css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "rel",

			"path" => "css/loader/",
			"local-path" => "./shared/css/loader/"
		],
		[ /* shared release css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/theme/",
			"local-path" => "./shared/css/theme/"
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
		[ /* own webassembly files */
			"type" => "wasm",
			"search-pattern" => "/.*\.(wasm)/",
			"build-target" => "dev|rel",

			"path" => "wat/",
			"local-path" => "./shared/wat/"
		]
	];

	$APP_FILE_LIST_SHARED_VENDORS = [
		[
			"type" => "js",
			"search-pattern" => "/.*(\.min)?\.js$/",
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
		]
	];

	$APP_FILE_LIST_CLIENT_SOURCE = [
		[ /* client css files */
			"client-only" => true,
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./client/css/"
		],
		[ /* client js files */
			"client-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js/",
			"build-target" => "dev",

			"path" => "js/",
			"local-path" => "./client/js/"
		],

		/* release specific */
		[ /* web merged javascript files (shared inclusive) */
			"client-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "rel",

			"path" => "js/",
			"local-path" => "./client/generated/"
		],
		[ /* Add the shared generated files. Exclude the shared file because we're including it already */
			"client-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"search-exclude" => "/shared\.js(.map)?$/",
			"build-target" => "rel",

			"path" => "js/",
			"local-path" => "./shared/generated/"
		]
	];

	$APP_FILE_LIST_WEB_SOURCE = [
		[ /* generated assembly files */
			"web-only" => true,
			"type" => "wasm",
			"search-pattern" => "/.*\.(wasm)/",
			"build-target" => "dev|rel",

			"path" => "wasm/",
			"local-path" => "./asm/generated/"
		],
		[ /* generated assembly javascript files */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.(js)/",
			"build-target" => "dev|rel",

			"path" => "wasm/",
			"local-path" => "./asm/generated/"
		],
		[ /* web generated worker codec */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/(WorkerCodec.js)$/",
			"build-target" => "dev|rel",

			"path" => "js/workers/",
			"local-path" => "./web/js/workers/"
		],
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
			"search-pattern" => "/client(\.min)?\.js$/",
			"build-target" => "rel",

			"path" => "js/",
			"local-path" => "./web/generated/"
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
		[ /* translations */
			"web-only" => true, /* Only required for the web client */
			"type" => "i18n",
			"search-pattern" => "/.*\.(translation|json)/",
			"build-target" => "dev|rel",

			"path" => "i18n/",
			"local-path" => "./shared/i18n/"
		]
	];

	$APP_FILE_LIST_WEB_TEASPEAK = [
		/* special web.teaspeak.de only auth files */
		[ /* login page and api */
			"web-only" => true,
			"type" => "html",
			"search-pattern" => "/.*\.(php|html)/",
			"build-target" => "dev|rel",
			"search-depth" => 1,

			"path" => "./",
			"local-path" => "./auth/",
			"req-parm" => ["-xf"]
		],
		[ /* javascript  */
			"web-only" => true,
			"type" => "js",
			"search-pattern" => "/.*\.js$/",
			"build-target" => "dev|rel",

			"path" => "js/",
			"local-path" => "./auth/js/",
			"req-parm" => ["-xf"]
		],
		[ /* web css files */
			"web-only" => true,
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "dev|rel",

			"path" => "css/",
			"local-path" => "./auth/css/",
			"req-parm" => ["-xf"]
		],
		[ /* certificates */
			"web-only" => true,
			"type" => "pem",
			"search-pattern" => "/.*\.pem$/",
			"build-target" => "dev|rel",

			"path" => "certs/",
			"local-path" => "./auth/certs/",
			"req-parm" => ["-xf"]
		]
	];

	$CERTACCEPT_FILE_LIST = [
		[ /* html files */
			"type" => "html",
			"search-pattern" => "/^([a-zA-Z]+)\.(html|php|json)$/",
			"build-target" => "dev|rel",

			"path" => "./popup/certaccept/",
			"local-path" => "./shared/popup/certaccept/html/"
		],

		[ /* javascript loader (debug) */
			"type" => "js",
			"search-pattern" => "/(loader|certaccept)\.js$/",
			"build-target" => "dev",

			"path" => "./popup/certaccept/loader/",
			"local-path" => "./shared/loader/"
		],
		[ /* javascript loader (releases) */
			"type" => "js",
			"search-pattern" => "/.*loader_certaccept.min.js$/",
			"build-target" => "rel",

			"path" => "./popup/certaccept/loader/",
			"local-path" => "./shared/generated/"
		],

		[ /* javascript imported from shared for debug */
			"type" => "js",
			"search-pattern" => "/^(BrowserIPC|log|proto|settings)\.js$/",
			"build-target" => "dev",

			"path" => "./popup/certaccept/js/",
			"local-path" => "./shared/js/"
		],

		[ /* javascript for debug */
			"type" => "js",
			"search-pattern" => "/^certaccept\.min\.js$/",
			"build-target" => "rel",

			"path" => "./popup/certaccept/js/",
			"local-path" => "./shared/generated/"
		],

		[ /* javascript for release */
			"type" => "js",
			"search-pattern" => "/^.*\.js$/",
			"build-target" => "dev",

			"path" => "./popup/certaccept/js/",
			"local-path" => "./shared/popup/certaccept/js/"
		],

		[ /* shared css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "rel|dev",

			"path" => "./popup/certaccept/css/loader/",
			"local-path" => "./shared/css/loader/"
		],

		[ /* shared css files */
			"type" => "css",
			"search-pattern" => "/.*\.css$/",
			"build-target" => "rel|dev",

			"path" => "./popup/certaccept/css/static/",
			"local-path" => "./shared/popup/certaccept/css/static/"
		],

		[ /* img files */
			"type" => "img",
			"search-pattern" => "/^(loading_error.*)\.(svg)$/",
			"build-target" => "dev|rel",

			"path" => "./popup/certaccept/img/",
			"local-path" => "./shared/img/"
		],

		[ /* jquery vendor */
			"type" => "js",
			"search-pattern" => "/^jquery\/.*\.js$/",
			"build-target" => "dev|rel",

			"path" => "./popup/certaccept/vendor/",
			"local-path" => "./vendor/"
		],
	];

	$APP_FILE_LIST = array_merge(
		$APP_FILE_LIST_SHARED_SOURCE,
		$APP_FILE_LIST_SHARED_VENDORS,
		$APP_FILE_LIST_CLIENT_SOURCE,
		$APP_FILE_LIST_WEB_SOURCE,
		$APP_FILE_LIST_WEB_TEASPEAK,

		$CERTACCEPT_FILE_LIST
	);

	function systemify_path($path) {
        return str_replace("/", DIRECTORY_SEPARATOR, $path);
    }

    function join_path(...$paths) {
        $result_path = "";
        foreach ($paths as $path) {
            if(strlen($result_path) > 0)
                $result_path .= DIRECTORY_SEPARATOR . $path;
            else
                $result_path = $path;
        }

        return $result_path;
    }

    function create_directories(&$error, $path, $dry_run = false) {
        if(strpos(PHP_OS, "Linux") !== false) {
            $command = "mkdir -p " . $path;
        } else if(strpos(PHP_OS, "WINNT") !== false) {
            $command = "mkdir " . $path; /* default path tree */
        } else {
            $error = "unsupported system";
            return false;
        }

        echo $command . PHP_EOL;
        if(!$dry_run) {
            exec($command, $error, $state);
            if($state) {
                $error = "Command execution results in " . $state . ": " . implode(' ', $error);
                return false;
            }
        }
        return true;
    }

    function delete_directories(&$error, $path, $dry_run = false) {
		if(!file_exists($path))
			return true;

        if(strpos(PHP_OS, "Linux") !== false) {
            $command = "rm -r " . $path;
        } else if(strpos(PHP_OS, "WINNT") !== false) {
            $command = "rm -r " . $path;
        } else {
            $error = "unsupported system";
            return false;
        }

        echo $command . PHP_EOL;
        if(!$dry_run) {
            $state = 0;
            exec($command, $output, $state);

            if($state !== 0) {
                $error = "Command execution results in " . $state . ": " . implode(' ', $output);
                return false;
            }
        }
        return true;
    }

    function create_link(&$error, $source, $target, $dry_run = false) {
        if(strpos(PHP_OS, "Linux") !== false) {
            $command = "ln -s " . $source . " " . $target;
        } else if(strpos(PHP_OS, "WINNT") !== false) {
            $command = "mklink " . (is_dir($target) ? "/D " : "") . " " . $target . " " . $source;
        } else {
            $error = "unsupported system";
            return false;
        }

        echo $command . PHP_EOL;
        if(!$dry_run) {
            $state = 0;
            exec($command, $output, $state);

            if($state !== 0) {
                $error = "Command execution results in " . $state . ": " . implode(' ', $output);
                return false;
            }
        }
        return true;
    }


    function list_dir($base_dir, $match = null, $depth = -1, &$results = array(), $dir = "") {
		if($depth == 0) return $results;

		if(!is_dir($base_dir . $dir)) {
		    echo "Skipping directory " . $base_dir . $dir . PHP_EOL;
		    return $results;
        }
		$files = scandir($base_dir . $dir);

		foreach($files as $key => $value){
			$path = $base_dir.$dir.DIRECTORY_SEPARATOR.$value;
			if(!is_dir($path)) {
				if(!$match || preg_match($match, ($dir ? $dir . DIRECTORY_SEPARATOR : "") . $value))
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

		public $target_path; /* relative path to the target file viewed from the file root */
		public $local_path; /* absolute path to local file */

		public $hash;
	}

	function normalizePath($path) {
		return array_reduce(explode('/', $path), create_function('$a, $b', '
			if($a === 0 && $b === ".")
				return "./";
			
			if($a === 0)
				$a = "/";

			if($b === "" || $b === ".")
				return $a;

			if($b === "..")
				return dirname($a);

			return preg_replace("/\/+/", "/", "$a/$b");
		'), 0);
	}

	function find_files($flag = 0b11, $local_path_prefix = "." . DIRECTORY_SEPARATOR, $target_path_prefix = "." . DIRECTORY_SEPARATOR, $type = "dev", $args = []) { //TODO Use cache here!
		global $APP_FILE_LIST;
		$result = [];

		foreach ($APP_FILE_LIST as $entry) {
			if(isset($entry["web-only"]) && $entry["web-only"] && ($flag & 0b01) == 0) continue;
			if(isset($entry["client-only"]) && $entry["client-only"] && ($flag & 0b10) == 0) continue;
			if(isset($entry["build-target"]) && array_search($type, explode("|", $entry["build-target"])) === false) continue;
			if(isset($entry["req-parm"])) {
				if(!is_array($entry["req-parm"]))
					$entry["req-parm"] = [$entry["req-parm"]];
				$valid = true;
				foreach($entry["req-parm"] as $parm) {
					if(array_search($parm, $args) === false)
						$valid = false;
				}
				if(!$valid)
					continue;
			}
			$entries = list_dir(
                systemify_path($local_path_prefix . $entry["local-path"]),
                $entry["search-pattern"],
                isset($entry["search-depth"]) ? $entry["search-depth"] : -1
            );
			foreach ($entries as $f_entry) {
				if(isset($entry["search-exclude"]) && preg_match($entry["search-exclude"], $f_entry)) continue;
				$file = new AppFile;

				$f_info = pathinfo($f_entry);
				$file->target_path = normalizePath($target_path_prefix . systemify_path($entry["path"]) . DIRECTORY_SEPARATOR . $f_info["dirname"]) . DIRECTORY_SEPARATOR;
				$file->local_path = normalizePath(getcwd() . DIRECTORY_SEPARATOR . systemify_path($entry["local-path"]) . DIRECTORY_SEPARATOR . $f_info["dirname"]) . DIRECTORY_SEPARATOR;

                $file->name = $f_info["basename"];
				$file->type = $entry["type"];
				$file->hash = sha1_file($file->local_path . DIRECTORY_SEPARATOR . $file->name);

				if(strlen($file->hash) > 0) {
					foreach ($result as $e)
						if($e->hash == $file->hash && $e->target_path == $file->target_path) goto ignore;
				}
				array_push($result, $file);
				ignore:
			}
		}

		return $result;
	}

	if(isset($_SERVER["argv"])) { //Executed by command line
	    $supported = false;
		if(strpos(PHP_OS, "Linux") !== false) {
		    $supported = true;
		} else if(strpos(PHP_OS, "WIN") !== false) {
            $supported = true;
        }
        if(!$supported) {
            error_log("Invalid operating system (" . PHP_OS . ")! Help tool only available under linux!");
            exit(1);
        }

		if(count($_SERVER["argv"]) < 2) {
			error_log("Invalid parameters!");
			goto help;
		}
		if($_SERVER["argv"][1] == "help") {
			help:
			echo "php " . $_SERVER["argv"][0] . " <type> <args...>" . PHP_EOL;
			echo "  generate <web/client> <dev/package> [-xf]" . PHP_EOL;
			echo "  list <web/client> <dev/package> [-xf]" . PHP_EOL;
			exit(1);
		} else if($_SERVER["argv"][1] == "generate" || $_SERVER["argv"][1] == "list") {
			$state = 0;
			$dry_run = $_SERVER["argv"][1] == "list";

			$flagset = 0b00;
			$environment = "";
			$type = "dev";
			if($_SERVER["argv"][3] == "dev" || $_SERVER["argv"][3] == "development") {
				if ($_SERVER["argv"][2] == "web") {
					$flagset = 0b01;
					$environment = "." . DIRECTORY_SEPARATOR . join_path("web", "environment", "development");
				} else if ($_SERVER["argv"][2] == "client") {
					$flagset = 0b10;
					$environment = "." . DIRECTORY_SEPARATOR . join_path("client-api", "environment", "ui-files", "raw");
				} else {
					error_log("Invalid type!");
					goto help;
				}
			} else if($_SERVER["argv"][3] == "rel" || $_SERVER["argv"][3] == "release") {
				$type = "rel";
				if ($_SERVER["argv"][2] == "web") {
					$flagset = 0b01;
					$environment = "." . DIRECTORY_SEPARATOR . join_path("web", "environment", "release");
				} else if ($_SERVER["argv"][2] == "client") {
					$flagset = 0b10;
					$environment = "." . DIRECTORY_SEPARATOR . join_path("client-api", "environment", "ui-files", "raw");
				} else {
					error_log("Invalid type!");
					goto help;
				}
			} else {
				error_log("Invalid type!");
				goto help;
			}

			{
				if(!$dry_run) {
				    if(delete_directories($error, $environment) === false)
				        goto handle_error;

					if(create_directories($error, $environment) === false)
					    goto handle_error;
				}

				$files = find_files($flagset, "." . DIRECTORY_SEPARATOR, $environment . DIRECTORY_SEPARATOR, $type, array_slice($_SERVER["argv"], 4));

                /** @var AppFile $file */
                foreach($files as $file) {
					if(!$dry_run && !is_dir($file->target_path) && strlen($file->target_path) > 0) {
                        if(create_directories($error, $file->target_path, $dry_run) === false)
                            goto handle_error;
					}

                    if(create_link($output, $file->local_path . $file->name, $file->target_path . $file->name, $dry_run) === false)
                        goto handle_error;
				}
				echo "Generated!" . PHP_EOL;
			}

			if(!$dry_run) {
				exec("." . DIRECTORY_SEPARATOR . "scripts" . DIRECTORY_SEPARATOR . "git_index.sh sort-tag", $output, $state);
				file_put_contents($environment . DIRECTORY_SEPARATOR . "version", $output);

				if ($_SERVER["argv"][2] == "client") {
					if(!chdir("client-api" . DIRECTORY_SEPARATOR . "environment")) {
						error_log("Failed to enter directory client-api/environment!");
						exit(1);
					}
					if(!is_dir("versions" . DIRECTORY_SEPARATOR . "beta")) {
                        exec($command = "mkdir -p versions/beta", $output, $state); if($state) goto handle_error;
                    }
					if(!is_dir("versions/stable")) {
                        exec($command = "mkdir -p versions/beta", $output, $state); if($state) goto handle_error;
					}

					exec($command = "ln -s ../api.php ./", $output, $state); $state = 0; //Dont handle an error here!
					if($state) goto handle_error;
				}
			}

			exit(0);
			handle_error:
			error_log("Command execution failed!");
			error_log("Error message: " . $error);
			exit(1);
		}
	}