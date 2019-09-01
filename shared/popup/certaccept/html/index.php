<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">

        <title>Certificate callback</title>

        <meta name="app-loader-target" content="certaccept">

        <!-- required static style for the critical page and the enable javascript page -->
        <style>
            .fulloverlay {
                z-index: 10000;
                display: none;
                position: fixed;

                top: 0;
                bottom: 0;
                left: 0;
                right: 0;

                background-color: gray;
                text-align: center;
            }

            .fulloverlay .container {
                position: relative;
                display: inline-block;

                top: 20%;
            }

            #critical-load.shown {
                display: block;
            }

            @media (max-height: 750px) {
                #critical-load .container {
                    top: unset;
                }

                #critical-load {
                    font-size: .8rem;

                    flex-direction: column;
                    justify-content: center;
                }

                #critical-load.shown {
                    display: flex;
                }
            }
        </style>

        <x-properties id="properties" style="display: none"> </x-properties>
    </head>
    <body>
        <div id="style">
            <link rel="stylesheet" href="css/loader/loader.css">
        </div>

        <div id="scripts">
            <script type="application/javascript" src="loader/loader_certaccept.min.js" defer></script>
            <script type="application/javascript" src="loader/loader_certaccept.js" defer></script>
            <script type="application/javascript" src="loader/loader.js?_<?php echo time() ?>" defer></script>
        </div>

        <!-- Loading screen -->
        <div class="loader" id="loader-overlay">
            <div class="half right"></div>
            <div class="half left"></div>
            <div class="bookshelf_wrapper">
                <ul class="books_list">
                    <li class="book_item first"></li>
                    <li class="book_item second"></li>
                    <li class="book_item third"></li>
                    <li class="book_item fourth"></li>
                    <li class="book_item fifth"></li>
                    <li class="book_item sixth"></li>
                </ul>
                <div class="shelf"></div>
            </div>
        </div>

        <!-- Critical load error -->
        <div class="fulloverlay" id="critical-load">
            <div class="container">
                <img src="img/loading_error_right.svg" style="height: 12em">
                <h1 class="error" style="color: red; margin-bottom: 0"></h1>
                <h3 class="detail" style="margin-top: .5em"></h3>
            </div>
        </div>

        <!-- success window -->
        <div id="container-success">
            <div class="spacer-top"></div>
            <div class="container">
                <div class="content">
                    <h1>Success!</h1>
                    <p>
                        <a>You've successfully accepted the certificate.</a>
                        <a>You will now connecting to the target server in the original tab.</a>
                    </p>
                    <p>
                        <a>This window will close automatically in <span id="time-left">X</span> seconds!</a>
                    </p>
                </div>
            </div>
            <div class="spacer-bottom"></div>
        </div>
    </body>
</html>