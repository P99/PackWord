

////////////////////////////////////
//   Generic cell
////////////////////////////////////

function Cell(id) {
    this.id = id;
    this.focused = false;
    this.hovered = false;
    this.dirty   = true;

    // Init general drawing stuff
    this.size = Game.prototype.grid_size / Game.prototype.grid_dim; // drawing area / nb colls
    this.row = (this.id % Game.prototype.grid_dim);
    this.col = Math.floor(this.id / Game.prototype.grid_dim);
    this.pos_x = this.row * this.size + (this.size / 2); // center align
    this.pos_y = this.col * this.size;

    if( typeof Cell.initialized == "undefined" ) {

        Cell.prototype.paint = function(ctx) {
            this.dirty = false;
        };

        Cell.prototype.drawBackground = function(ctx, color) {
            ctx.strokeStyle = "Black";
            ctx.fillStyle   = color;
            ctx.lineWidth   = 1;
            ctx.setLineDash([]);
            ctx.fillRect(this.pos_x - (this.size /2), this.pos_y, this.size, this.size);
            ctx.strokeRect(this.pos_x - (this.size /2), this.pos_y, this.size, this.size); // Black border
        };

        Cell.prototype.onMouseOver = function() {
            this.hovered = true;
            this.dirty   = true;
        };

        Cell.prototype.onMouseOut = function() {
            this.hovered = false;
            this.dirty   = true;
        };

        Cell.prototype.onFocus = function() {
            this.focused = true;
            this.dirty   = true;
        };

        Cell.prototype.onBlur = function() {
            this.focused = false;
            this.dirty   = true;
        };

        Cell.prototype.onKeyDown = function() {
            // Abstract
        };

        Cell.initialized = true;
    }

}

////////////////////////////////////
//   Letter cell
////////////////////////////////////

// Inherit from basic cell
LetterCell.prototype = new Cell();
// Correct contructor pointer
LetterCell.prototype.constructor = LetterCell;

function LetterCell(id) {

    this.status = "empty"; // "empty", "try", "found"
    this.arrow = null;
    this.tx = "";
    this.color = "white";

    // Call the parent contructor
    Cell.call(this, id);

    if( typeof LetterCell.initialized == "undefined" ) {

        LetterCell.prototype.onKeyDown = function(key) {

            if (this.status != "found") {
                if ((key < 91) && (key > 64)) {
                    // Letters
                    this.tx = String.fromCharCode(key);
                    this.status   = "try";
                }
                else {
                    this.tx = "";
                    this.status   = "empty";
                }
                this.dirty  = true;
            }
        };

        LetterCell.prototype.update = function(data) {
            // Update properties
            console.log(JSON.stringify(data));
            for (property in data) {
                if (this.hasOwnProperty(property)) {
                    console.log("Update: " + property + "=" + data[property]);
                    this[property] = data[property];
                }
            }
            this.dirty  = true;
        };

        LetterCell.prototype.paint = function(ctx) {
            // Draw background
            this.drawBackground(ctx, this.hovered ? "#D3E0E3" : this.color);
            // Draw focus
            if (this.focused) {
                this.drawFocus(ctx);
            }
            // Draw arrow if any
            if (this.arrow) {
                this.arrow.paint(ctx);
            }
            // Draw letter if any
            if (this.tx != "") {
                this.drawLetter(ctx);
            }

            this.dirty = false;
        };

        LetterCell.prototype.drawFocus = function(ctx) {
            ctx.fillStyle   = "Black";
            ctx.strokeStyle = "Red";
            ctx.lineWidth   = 4;
            ctx.setLineDash([7,14]);
            ctx.strokeRect(this.pos_x - this.size / 2 +4, this.pos_y +4, this.size -8, this.size -8);
        };

        LetterCell.prototype.drawLetter = function(ctx) {
            ctx.fillStyle    = "Black";
            ctx.strokeStyle  = "Black";
            ctx.lineWidth    = 1;
            ctx.textBaseline = "middle";
            ctx.textAlign    = "center"; 
            ctx.font = (this.size * 0.7) + "px Arial";
            ctx.fillText(this.tx, this.pos_x, this.pos_y + (this.size / 2) ); // Center align
        };

        LetterCell.prototype.setArrow = function(arrow) {
            this.arrow = arrow;
        };

        LetterCell.initialized = true;
    }

}

////////////////////////////////////
//   Caption cell
////////////////////////////////////

// Inherit from basic cell
CaptionCell.prototype = new Cell();
// Correct contructor pointer
CaptionCell.prototype.constructor = CaptionCell;

function CaptionCell(id, type, captions) {

    this.type = type;
    this.captions = captions;

    // Call the parent contructor
    Cell.call(this, id);

    if( typeof CaptionCell.initialized == "undefined" ) {

        CaptionCell.prototype.paint = function(ctx) {
            // CaptionCell background is light yellow
            this.drawBackground(ctx, "#FFEF91");
            this.drawCaptions(ctx);

            this.dirty = false;
        };

        CaptionCell.prototype.onMouseOver = function() {
            // TODO: zoom factor
            this.dirty = true;
        };

        CaptionCell.prototype.onMouseOut = function() {
            this.dirty = true;
        };

        CaptionCell.prototype.drawCaptions = function(ctx) {
            var line_height = this.size * 0.17;

            // Display caption
            ctx.fillStyle    = "Black";
            ctx.strokeStyle  = "Black";
            ctx.lineWidth    = 1;
            ctx.textBaseline = "top";
            ctx.textAlign    = "center";
            ctx.font = (this.size * 0.15) + "px Arial";

            if (this.type > "e") {
                // Display two captions in a single cell
                var lines = this.captions[0].split("\n");
                for (j = 0; j< lines.length; j++) {
                    ctx.fillText(lines[j], this.pos_x, this.pos_y + j * line_height + line_height / 2);
                }

                // Drawing separator
                ctx.fillStyle="Black";
                ctx.fillRect(this.pos_x - (this.size / 2), this.pos_y + j * line_height + line_height / 2, this.size, 2);

                lines = this.captions[1].split("\n");
                var y_offset = (5 - j - lines.length) * line_height / 2;
                for (k = 0; k< lines.length; k++) {
                    ctx.fillText(lines[k], this.pos_x, this.pos_y + (j+k+1) * line_height + y_offset);
                }
              
            } 
            else {
                // Display single caption
                var lines = this.captions[0].split("\n");
                var y_offset = (5 - lines.length) * line_height / 2;
              
                for (var k = 0; k<lines.length; k++) {
                    ctx.fillText(lines[k], this.pos_x, this.pos_y + k * line_height + y_offset);
                }
            }
        };

        CaptionCell.prototype.buildArrows = function(ctx) {
            
            var line_height = this.size * 0.17;
            var j = this.captions[0].split("\n").length;
            var half = this.size / 2;
            var arrows = new Array();
            var arrow = new Arrow();
            var arrow2 = new Arrow();

            switch (this.type) {
                    // Only one captions per cell
                case "a":
                    // 1st -> right
                    arrow.setHead(0, half, "horizontal");
                    arrows.push({"right" : arrow});
                    break;
                case "b":
                    // 1st -> down
                    arrow.setHead(half, 0, "vertical");
                    arrows.push({"down" : arrow});
                    break;
                case "c":
                    // 1st -> side down
                    arrow.setTail();
                    arrow.setHead(half, 0, "vertical");
                    arrows.push({"right" : arrow});
                    break;
                case "d":
                    // 1st -> bottom right
                    arrow.setTail();
                    arrow.setHead(0, half, "horizontal");
                    arrows.push({"down" : arrow});
                    break;


                    // Two captions per cell
                case "f":
                case "g":
                case "h":
                    // 1st -> right
                    arrow.setHead(0, (j * line_height), "horizontal");
                    arrows.push({"right" : arrow});
                    // 2nd -> down
                    arrow2.setHead(half, 0, "vertical");
                    arrows.push({"down" : arrow2});
                    break;
                case "k":
                case "l":
                case "m":
                    // 1st -> side down
                    arrow.setTail();
                    arrow.setHead(half, 0, "vertical");
                    arrows.push({"right" : arrow});
                    // 2nd -> down
                    arrow2.setHead(half, 0, "vertical");
                    arrows.push({"down" : arrow2});
                    break;
                case "p":
                case "q":
                case "r":
                    // 1st -> right
                    var pos_y = j < 3 ? (j * line_height) : half;
                    arrow.setHead(0, pos_y, "horizontal");
                    arrows.push({"right" : arrow});
                    // 2nd -> bottom right
                    arrow2.setTail();
                    arrow2.setHead(0, half, "horizontal");
                    arrows.push({"down" : arrow2});
                    break;
                case "v":
                    // 1st -> side down
                    arrow.setTail();
                    arrow.setHead(half, 0, "vertical");
                    arrows.push({"right" : arrow});
                    // 2nd -> bottom right
                    arrow2.setTail();
                    arrow2.setHead(0, half, "horizontal");
                    arrows.push({"down" : arrow2});
                    break;
                default:
                    console.log("Un-handled case: " + grid_letters[i]);
            } // End switch

            return arrows;
        };

        CaptionCell.initialized = true;
    }
}
