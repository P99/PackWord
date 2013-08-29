<?php
// Begin php code here
?>

<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <script src="script/jquery-1.9.1.min.js"></script>
        <script src="script/base.js"></script>
        <script src="script/game.js"></script>
        <script src="script/cell.js"></script>
        <script src="script/arrow.js"></script>
    </head>
    <body>
    
        <div id="screen_grid">
            <canvas id="mfl_canvas" width="1200" height="1200"></canvas>
        </div>

        <div id="screen_games">
          <div id="games" />
        </div>
        
        <div id="screen_ready">
            <form name="player_ready">
                Are you ready? <br>
                <input type="button" name="yes" value="yes" onClick="isReady(true)">
                <input type="button" name="no" value="no" onCLick="isReady(false)">
            </form>
        </div>

        <div id="screen_info">
        </div>

        <script>
            var game =  new Base();
            game.init();

            function send(uri) {
                game.send(uri);
            }

            function isReady(status) {
                document.forms["player_ready"]["yes"].disabled = true;
                document.forms["player_ready"]["no"].disabled = true;
                game.sendReady(status);
            }
        </script>
    </body>
</html>
