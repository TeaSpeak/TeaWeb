<?php
	$GLOBALS["COOKIE_NAME_USER_DATA"] = "user_data";
	$GLOBALS["COOKIE_NAME_USER_SIGN"] = "user_sign";

	$host = gethostname();
	$localhost = false;
	if($host == "WolverinDEV")
		$localhost = true;

	function authPath() {
		if (file_exists("auth")) {
			return "auth/";
		} else return "";
	}

	function mainPath() {
		global $localhost;
		if ($localhost) {
			return "../";
		} else return "";
	}

	function remoteAddress()
	{
		if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
			$ip = $_SERVER['HTTP_CLIENT_IP'];
		} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
			$ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
		} else {
			$ip = $_SERVER['REMOTE_ADDR'];
		}
		return $ip;
	}

	/** @return \XF\App */
	function getXF()
	{
		if (isset($GLOBALS["XF_APP"])) return $GLOBALS["XF_APP"];

		if (file_exists("/var/www/forum.teaspeak"))
			$dir = "/var/www/forum.teaspeak";
		else if (file_exists(__DIR__ . "/xf"))
			$dir = __DIR__ . "/xf";
		else if (file_exists(__DIR__ . "/auth/xf"))
			$dir = __DIR__ . "/auth/xf";
		else
			return null;

		require($dir . '/src/XF.php');

		XF::start($dir);
		return ($GLOBALS["XF_APP"] = XF::setupApp('XF\Pub\App'));
	}

	function milliseconds()
	{
		$mt = explode(' ', microtime());
		return ((int)$mt[1]) * 1000 + ((int)round($mt[0] * 1000));
	}

	/**
	 * @param $username
	 * @param $password
	 * @return array
	 */
	function checkLogin($username, $password) {
		$allowedXFGroups = [
			3, //Administrator
			6, //Web tester
			5  //Premium
		];
		$app = getXF();

		$response = [];
		$response["success"] = false;
		if(!$app) goto _return;

		if (!isset($username) || !isset($password)) {
			$response["msg"] = "missing credentials";
			goto _return;
		}

		/** @var \XF\Service\User\Login $loginService */
		$loginService = $app->service('XF:User\Login', $username, "");
		if (!$loginService->isLoginLimited()) {
			$error = "";
			$user = $loginService->validate($password, $error);
			if ($user) {
				$response["success"] = true;
				$allowed = false;
				foreach ($allowedXFGroups as $id) {
					foreach ($user->secondary_group_ids as $assigned)
						if ($assigned == $id) {
							$allowed = true;
							break;
						}
					$allowed |= $user->user_group_id == $id;
					if ($allowed) break;
				}
				if ($allowed) {
					$response["allowed"] = true;

					try {
						/** @var  $session XF\Session\Session */
						$session = $app->session();
						if (!$session->exists()) {
							$session->expunge();
							if (!$session->start(remoteAddress())) {
								$response["success"] = false;
								$response["msg"] = "could not create session";
								goto _return;
							}
						}
						$session->changeUser($user);
						$session->save();
						$response["sessionName"] = $session->getCookieName();
						$response["sessionId"] = $session->getSessionId();
						$response["user_name"] = $user->username;
					} catch (Exception $error) {
						$response["success"] = false;
						$response["msg"] = $error->getMessage();
					}
					goto _return;
				} else {
					$response["allowed"] = false;
				}
			} else {
				$response["msg"] = $error;
			}
		} else {
			$response["msg"] = "Too many login's!";
		}

		_return:
		return $response;
	}

	function logged_in() {
		return test_session() == 0;
	}

	function logout()
	{
		$app = getXF();
		if(!$app) return false;

		$session = $app->session();
		$session->expunge();

		return true;
	}

	/**
	 * @param null $sessionId
	 * @return int 0 = Success | 1 = Invalid coocie | 2 = invalid session
	 */
	function test_session($sessionId = null) {
		$app = getXF();
		if(!$app) return -1;

		if(!isset($sessionId)) {
			if (!isset($_COOKIE[$app->session()->getCookieName()]))
				return 1;
			$sessionId = $_COOKIE[$app->session()->getCookieName()];
		}
		$app->session()->expunge();
		if (!$app->session()->start(remoteAddress(), $sessionId) || !$app->session()->exists())
			return 2;
		return 0;
	}

	function redirectOnInvalidSession() {
		$app = getXF();
		if(!$app) return;

		$status = test_session();
		if ($status != 0) {
			$type = "undefined";
			switch ($status) {
				case 1:
					$type = "nocookie";
					break;
				case 2:
					$type = "expired";
					break;
				default:
					$type = "unknown";
					break;
			}
			header('Location: ' . authPath() . 'login.php?error=' . $type);
			setcookie($app->session()->getCookieName(), "", 1);
			die();
		}
	}

	function setup_forum_auth() {
		getXF(); /* Initialize XF */
	}

	if(!defined("_AUTH_API_ONLY")) {
		$app = getXF();
		if(!$app) {
			die("failed to start app");
		}

		if (isset($_GET["type"])) {
			error_log("Got authX request!");
			if ($_GET["type"] == "login") {
				die(json_encode(checkLogin($_POST["user"], $_POST["pass"])));
			} else if ($_GET["type"] == "logout") {
				logout();
				global $localhost;
				if($localhost)
					header("Location: login.php");
				else
					header("Location: https://web.teaspeak.de/");

				$session = $app->session();
				setcookie($session->getCookieName(), '', time() - 3600, '/');
				setcookie("session", '', time() - 3600, '/');
				setcookie("user_data", '', time() - 3600, '/');
				setcookie("user_sign", '', time() - 3600, '/');
			} else die("unknown type!");
		} else if(isset($_POST["action"])) {
			error_log("Got auth post request!");
			if($_POST["action"] === "login") {
				die(json_encode(checkLogin($_POST["user"], $_POST["pass"])));
			} else if ($_POST["action"] === "logout") {
				logout();
				die(json_encode([
					"success" => true
				]));
			} else if($_POST["action"] === "validate") {
				$app = getXF();
				if(test_session($_POST["token"]) === 0)
					die(json_encode([
						"success" => true,
						"token" => $app->session()->getSessionId()
					]));
				else
					die(json_encode([
						"success" => false
					]));
			} else
				die(json_encode([
					"success" => false,
					"msg" => "Invalid action"
				]));
		}
	}