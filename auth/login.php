<?php
    include_once('auth.php');

    $session = test_session();
    if($session == 0) {
        header('Location: ' . mainPath() . 'index.php');
        die();
    }
?>

<!DOCTYPE html>
<html>
    <head>
        <link rel="stylesheet" href="css/auth.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        <script src="https://code.jquery.com/jquery-latest.min.js"></script>
    </head>
    <body>
        <div class="inner-container">
            <div class="box">
                <h1>Login</h1>
                <div id="login">
                    <a class="error">some error code</a>
                    <input type="text" placeholder="Username" id="user"/>
                    <input type="password" placeholder="Password" id="pass"/>
                    <button id="btn_login" target="<?php echo mainPath() . "index.php"; ?>">Login</button>
                    <p>Create a account on <a href="//forum.teaspeak.de">forum.teaspeak.de</a></p>
                </div>
                <div id="success">
                    <a> Successful logged in!</a><br>
                    <a>You will be redirected in 3 seconds</a>
                </div>
               </div>
        </div>
        <script src="js/auth.js"></script>
    </body>
</html>