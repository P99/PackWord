function Base() {

    if( typeof Base.initialized == "undefined" ) {

        Base.prototype.socket = null;
        Base.prototype.state = "free";
        Base.prototype.uri = "";
        Base.prototype.data = null;
        Base.prototype.MFLgame = null;
        Base.prototype.color = null;

        // Public - Begin game
        Base.prototype.init = function() {

            // Init screens
            $("#screen_grid").hide();
            $("#screen_join").show();
            $("#screen_games").show();
            $("#screen_ready").hide();

            this.connect();
        };

        Base.prototype.info = function(message) {
            var info_screen = $("#screen_info");
            if (info_screen) {
                info_screen.empty();
                info_screen.append(message);
                info_screen.show();
            }
        };

        // Internal - Connect to web server
        Base.prototype.connect = function() {
            that = this;

            try {
                var hostname     = "packword-p99.rhcloud.com";
                var port         = "80";
                var socket       = new WebSocket("ws://" + hostname + ":" + port + "/packwords");
                socket.onopen    = function (msg) { console.log("Welcome - status " + this.readyState); };
                socket.onmessage = function (msg) { 
                    var input = JSON.parse(msg.data);
                    var action = input["action"];
                    var data = input["data"];

                    that.onMessage(action, data);
                
                };
                socket.onerror   = function (msg) { console.log("Error: " + msg.data); };
                socket.onclose   = function (msg) { 
                    console.log("Disconnected - status " + this.readyState);
                    that.info("Failed to connect to ws://" + hostname + ":" + port + "/packwords");
                };
                this.socket = socket;
            } 
            catch(ex) { 
                console.log("WebSocket issue: " + ex);
                this.info("WebSocket not supported");
            }

            window.onbeforeunload = function() {
                this.socket.onclose = function () {}; // disable onclose handler first
                this.socket.close();
            };

        };

        // Internal - Receiving data
        // List players
        Base.prototype.onMessage = function(action, data) {
            console.log("[message] uri=" + action + " data=" + JSON.stringify(data));

            // Internal helper function - recursive
            // Apply json data to existing JS Object 
            function updateData(obj, data) {
              for (var property in data) {
                if (obj[property]) {
                  if ( obj[property] === Object(obj[property]) ) {
                    updateData(obj[property], data[property]);
                  } else {
                    obj[property] = data[property];
                  }
                } else {
                  obj[property] = data[property];
                }
              }
            };

            // split uri
            var key = null;
            var rest = new Object();
            var vars = action.split(/\/|#/); // split both slashes and fragment '#'
            for (var i=0; i<vars.length; i++) {
                if (i%2) {
                  rest[key] = vars[i];
                } else {
                  key = vars[i];
                }
            }

            // go through current data
            if (this.data) {
            var obj = this.data;
            for (var property in rest) {
              if (obj.hasOwnProperty(property)) {
                obj = obj[property];
                if ($.isArray(obj)) {
                  if (obj[rest[property]] == undefined) {
                    obj[rest[property]] = new Object();
                  }                    
                  obj = obj[rest[property]];
                }
              }
            }

            // update with new values
            updateData(obj, data);
            } else {
              this.data = data;
            }

            switch (this.state) {
              case "free":
                //if (action.match(/players\/\d+/) != -1) {
                if (action.indexOf("players") != -1) {
                  this.state = "join";
                  this.uri = action;
                  if(data.hasOwnProperty("color")) {
                    this.color = data.color;
                  }
                } 
                break;
              case "join":
                if (action.indexOf("#status") != -1) {
                  this.onReady();
                  // ToDO: Handle occupied state here
                  this.state = "ready";
                } 
                break;
              case "ready":
                if (action.match(/parties\/\d+/) != -1) {
                  if (data["status"] == "play") {
                    console.log("Now playing");
                    this.state = "play";
                    this.onPlay(data);
                  }
                }
                break;
              case "play":
                this.MFLgame = new Game();
                this.MFLgame.init(this);
                if(data.hasOwnProperty("cells")) {
                  this.MFLgame.grid(data.cells);
                }
                this.state = "playing";
                break;
              case "playing":
                if(data.hasOwnProperty("cells")) {
                  this.MFLgame.update(data.cells);
                }
                break;
              default:
                console.log("Un-handled case: uri=" + action + " data=" + JSON.stringify(data));
            }

            // display new data
            this.onGames(action, this.data);
        };


        // Public - Sending
        Base.prototype.send = function(uri) {
            console.log("[send] uri=" + uri);
            switch (this.state) {
              case "free":
                if (uri.indexOf("players") != -1) {
                  this.sendPlayer(uri);
                } else if (uri.indexOf("parties") != -1) {
                  this.sendParty(uri);
                }
                break;
              default:
                console.log("Un-handled case" + this.state);
            }
        };

        // Public - Sending
        Base.prototype.sendPlayer = function(uri) {
            var output = {"action": uri, "data" : {"player": {"name" : "palou2"}}};
            output = JSON.stringify(output);
            this.socket.send(output);
        };

        // Public - Sending
        Base.prototype.sendParty = function(uri) {
            var output = {"action": uri, "data" : {"party": {"players" : [{"name" : "palou1"}]}}};
            output = JSON.stringify(output);
            this.socket.send(output);
        };

        // Public - Sending
        Base.prototype.sendReady = function(isReady) {
            var output = {"action": this.uri + "#status", "data" : isReady ? "ready" : "occupied"};
            output = JSON.stringify(output);
            this.socket.send(output);
        };

        // Private - Sending from child
        Base.prototype.sendCells = function(cells) {
            var uri = this.uri;
            var party = uri.split("/");
            if (party.length > 4 ) {
              party = party.slice(0, 4);
              uri = party.join("/");
            }
            var output = {"action": uri + "/cells", "data": {"cells" : cells}};
            output = JSON.stringify(output);
            this.socket.send(output);
        };

        Base.prototype.onGames = function(action, data) {
            var html = "";
            if (data.hasOwnProperty("games")) {
              for (id in data.games) {
                html = "<div id=\""+ "games-" + id +"\">";
                html += this.onGame(action + "/" + id, data.games[id]);
                html += "</div>";
              }
            }
            $("#games").empty();
            $("#games").append(html);
        };

        Base.prototype.onGame = function(action, game) {
          var html = "";
          html += game.name + "</br>";
          if (game.hasOwnProperty("parties")) {
            html += "<div>";
            for (id in game.parties) {
              html += "<div id=\""+ action.split("/").join("-") + "-parties-" + id +"\">";
              html += this.onParty(action + "/parties/" + id, game.parties[id]);
              html += "</div></br>";
            }
            html += "</div>";
          }
          // new button
          if (this.state == "free") {
            uri = action + "/parties/" + "new";
            html += "<input type='button' value='Nouvelle partie' onClick='JavaScript:send(\"" + uri + "\")'>";
          }
          return html;
        };

        Base.prototype.onParty = function(action, party) {
          var html = "";
          if (party.hasOwnProperty("players")) {
            html += "<div>";
            for (id in party.players) {
              html += "<div id=\""+ action.split("/").join("-") + "-players-" + id +"\">";
              html += this.onPlayer(action + "/players/" + id, party.players[id]);
              html += "</div>";
            }
            html += "</div>";
          }
          // join button
          if ((this.state == "free") && (party.status == "init")) {
            uri = action + "/players/" + "new";
            html += "<input type='button' value='Rejoindre' onClick='JavaScript:send(\"" + uri + "\")'>";
          }
          return html;
        };

        Base.prototype.onPlayer = function(action, player) {
          var html = player.name + "</br>";
          return html;
        };

        // Internal - Received
        // All players have to be ready
        Base.prototype.onReady = function() {
            console.log("[ready]");

            $("#screen_grid").hide();
            $("#screen_join").hide();
            $("#screen_games").show();
            $("#screen_ready").show();

            // ToDo: Add a timeout
        };

        // Internal
        // All players are ready start game
        Base.prototype.onPlay = function(data) {
            console.log("[play]");

            $("#screen_grid").show();
            $("#screen_join").hide();
            $("#screen_players").hide();
            $("#screen_ready").hide();

        };

        // Public - Sending
        // Player is ready
        Base.prototype.confirm = function() {
            var output = {"action": "confirm", "data" : {}};
            output = JSON.stringify(output);
            this.socket.send(output);    
        };

        Base.initialized = true;
    }

}
