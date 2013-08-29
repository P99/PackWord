function Game() {

    if( typeof Game.initialized == "undefined" ) {

        Game.prototype.cells = new Array();
        Game.prototype.focused_id = -1;
        Game.prototype.hovered_id = -1;
        Game.prototype.navKeys = {37 : "left", 38 : "up", 39: "right", 40 : "down"};

        // Public - Begin game
        Game.prototype.init = function(parent) {
            // Init html5 display
            this.initGraphics();

            // Adding listeners (mouse + keyboard)
            this.addListeners();

            // Save send() function from parent
            Game.prototype.sendCells = function(data) { parent.sendCells(data); };
            Game.prototype.color = parent.color;
        };
        
        Game.prototype.initGraphics = function() {
            // Drawing context
            Game.prototype.canvas = document.getElementById("mfl_canvas"); // $("#mfl_canvas"); ???
            Game.prototype.ctx    = document.getElementById("mfl_canvas").getContext("2d");
            
            // Update grid data
            Game.prototype.grid_dim = 13; // hardcoded
            Game.prototype.grid_size = Math.min(this.ctx.canvas.width, this.ctx.canvas.height);

            Game.prototype.dirty  = true;
            
            // Fix dashed lines on Firefox
            if (!this.ctx.setLineDash) {
                this.ctx.setLineDash = function (array) {
                    if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
                        this.mozDash = array;
                    } 
                }
            }
        };

        // Internal - Compute cell id according to move coordinates
        Game.prototype.findCellId = function(event) {
            var rect = this.canvas.getBoundingClientRect();
            // Relative coordinates
            var pos_x = event.clientX - rect.left;
            var pos_y = event.clientY - rect.top;

            // Check which cell is hovered
            var cell_size = this.grid_size / this.grid_dim;
            var id = Math.floor(pos_x/cell_size) + Math.floor(pos_y/cell_size) * this.grid_dim;

            return id;
        };

        // Internal - Try to move focus to this cell
        // Target cell must be a LetterCell
        // Handle cell states + repaint
        Game.prototype.moveFocus = function(id) {

            // Send onFocus / onBlur only if focused cell has changed
            if ((id != this.focused_id) && this.cells[id]) {
                if (this.focused_id >= 0) {
                    this.cells[this.focused_id].onBlur();
                }
                this.cells[id].onFocus();
                this.focused_id = id;
                this.dirty = true;
            }
        };

        // Internal - Move focus according to navigation key
        Game.prototype.navigation = function(direction) {

            var id = this.focused_id;
                switch (direction) {
                    case "left":
                        if (id % this.grid_dim > 0) {
                            id --;
                        }
                        break;
                    case "right":
                        if (id % this.grid_dim < this.grid_dim -1) {
                            id ++;
                        }
                        break;
                    case "up":
                        if (id > this.grid_dim) {
                            id -= this.grid_dim;
                        }
                        break;
                    case "down":
                        if (id < (this.grid_dim * (this.grid_dim -1))) {
                            id += this.grid_dim;
                        }
                        break;
                    default:
                        console.log("Unhandled navigation key ??? " + key);
                }

            if(this.cells[id].constructor === LetterCell.prototype.constructor) {
                this.moveFocus(id);
            } 
        };

        // Internal - Register all event listeners
        Game.prototype.addListeners = function() {
            var that = this;
            this.canvas.addEventListener('mousemove', function(event) {
                var id = that.findCellId(event);

                // Send onMouseOver / onMuseOut only if hovered cell has changed
                if ((id != that.hovered_id) && that.cells[id]) {
                    if (that.hovered_id >= 0) {
                        that.cells[that.hovered_id].onMouseOut();
                    }
                    that.cells[id].onMouseOver();
                    that.hovered_id = id;
                    that.dirty = true;
                }
            });

            this.canvas.addEventListener('mousedown', function(event) {
                var id = that.findCellId(event);
                that.moveFocus(id);
            });

            this.canvas.addEventListener('mouseout', function(event) {
                // Canvas lost focus
                that.cells[that.hovered_id].onMouseOut();
                that.hovered_id = -1;
                that.dirty = true;
            });

            // Key event is handled at page level
            document.addEventListener('keydown', function(event) {
                var key = event.keyCode;
                
                if (key < 37) {
                    // backspace - clear letter in cell
                    if ((key == 8) && (that.focused_id >= 0)) {
                        that.cells[that.focused_id].onKeyDown(key);
                        that.dirty = true;
                    }
                } 
                else if (key < 41) {
                    // navigation keys
                    that.navigation(that.navKeys[key]);
                } 
                else if (key < 65) {
                    // unused (digits)
                } 
                else if (key < 91) {
                    // letters
                    if (that.focused_id >= 0) {
                        that.cells[that.focused_id].onKeyDown(key);
                        that.dirty = true;
                        that.validate();
                    }
                } 
                else {
                    // unused
                }
            });
        };


        // Internal - Received
        // Game is starting - Grid must be saved
        Game.prototype.grid = function(data) {

            // Build all cells
            // Received only captions cells from server
            // Compute arrows for each caption cell 
            // Each arrow is attached letteron to a letter cell
            var arrows = new Array();
            for (var id=0; id<Math.pow(this.grid_dim, 2); id++) {
                if (data[id]) {
                    if (data[id]["type"] == "empty") {
                        this.cells[id] = new Cell(id);
                    } 
                    else {
                        this.cells[id] = new CaptionCell(id, data[id]["tx"], data[id]["captions"]);
                        var temp = this.cells[id].buildArrows();
                        for (var i in temp) {
                            if (temp[i]["right"]) {
                                  arrows[id + 1] = temp[i]["right"];
                            } 
                            else if (temp[i]["down"]) {
                                arrows[id + this.grid_dim] = temp[i]["down"];
                            } 
                            else {
                                console.log("Something went terribly wrong!");
                            }
                        }
                    }
                        
                } 
                else {
                    this.cells[id] = new LetterCell(id);
                    if (arrows[id]) {
                        arrows[id].moveTo(this.cells[id].pos_x - this.cells[i].size / 2, this.cells[id].pos_y);
                        this.cells[id].setArrow(arrows[id]);
                    }
                }
            }

            // Start game
            this.start();
        };

        // Internal
        // Game just started - Graphical update
        Game.prototype.start = function() {
            var that = this;
            window.setInterval(function(){that.paint();}, 100);
        };

        // Internal - Received
        // Grid is updating with new letters
        Game.prototype.update = function(data) {
            for (var id in data) {
                this.cells[id].update(data[id]);
            }
            this.dirty = true;
        };


        // Internal
        // Redisplay
        Game.prototype.paint = function() {

            if (this.dirty == true) {
                for (var id in this.cells) {
                    if (this.cells[id].dirty) {
                       // Dirty cells should redraw
                       this.cells[id].paint(this.ctx);
                    }
                }
                this.dirty = false;
            }
        };

        // Internal - Sending
        // Validate all cells
        Game.prototype.validate = function() {
            var data = new Object();
            for (var id in this.cells) {
                if ((this.cells[id].status == "try") && this.cells[id].tx) {
                    data[id.toString()] = {"status" : "try", "tx" : this.cells[id].tx, "color" : this.color };
                }
            }
            this.sendCells(data);
        };
            
        Game.initialized = true;
    }
}
