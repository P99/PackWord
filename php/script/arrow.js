
function Arrow() {
    this.tail_x = -1;
    this.tail_y = -1;
    this.head_x = -1;
    this.head_y = -1;
    this.size = Game.prototype.grid_size / Game.prototype.grid_dim; // drawing area / nb colls
    this.head_size = this.size * 0.2;
    this.direction = "vertical";
    this.pos_x = 0;
    this.pos_y = 0;

    if( typeof Arrow.initialized == "undefined" ) {

        Arrow.prototype.setTail = function() {
            this.tail_x = 0;
            this.tail_y = 0;
        };

        Arrow.prototype.setHead = function(x, y, direction) {
            this.head_x = x;
            this.head_y = y;
            this.direction = direction;
        };

        Arrow.prototype.moveTo = function(x, y) {
            this.pos_x = x;
            this.pos_y = y;
        };

        Arrow.prototype.paint = function(ctx) {
            if ((this.head_x >= 0) && (this.head_y >= 0)) {
                // Drawing arrow head
                this.drawHead(ctx);
                if ((this.tail_x >= 0) && (this.tail_y >= 0)) {
                    this.drawTail(ctx);
                }
            }
        };

        Arrow.prototype.drawHead = function(ctx) {
            ctx.fillStyle   = "Black";
            ctx.strokeStyle = "Black";
            ctx.lineWidth   = 1;
            ctx.beginPath();
            switch (this.direction) {
                case "horizontal":
                    ctx.moveTo(this.pos_x + this.head_x,                        this.pos_y + this.head_y - (this.head_size / 2));
                    ctx.lineTo(this.pos_x + this.head_x + (this.head_size /2) , this.pos_y + this.head_y);
                    ctx.lineTo(this.pos_x + this.head_x,                        this.pos_y + this.head_y + (this.head_size / 2));
                    break;
                case "vertical":
                    ctx.moveTo(this.pos_x + this.head_x - (this.head_size / 2), this.pos_y + this.head_y);
                    ctx.lineTo(this.pos_x + this.head_x + (this.head_size / 2), this.pos_y + this.head_y);
                    ctx.lineTo(this.pos_x + this.head_x,                        this.pos_y + this.head_y + (this.head_size / 2));
                    break;
                default:
                    console.log("Undefined arrow type: " + direction);
            }
            ctx.closePath();
            ctx.fill();
        };

        Arrow.prototype.drawTail = function(ctx) {
            ctx.fillStyle   = "Black";
            ctx.strokeStyle = "Black";
            ctx.lineWidth   = 3;
            ctx.moveTo(this.pos_x + this.tail_x, this.pos_y + this.tail_y);
            ctx.lineTo(this.pos_x + this.head_x, this.pos_y + this.head_y);
            ctx.stroke();
        };

        Arrow.initialized = true;
    }
}
