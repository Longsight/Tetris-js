$(document).ready(function() {
    var w = tetris._w * tetris._g;
    var h = (tetris._h - 2) * tetris._g;
    var nw = 4 * tetris._g;
    var nh = 10 * tetris._g;
    $('#playArea').width(w).height(h).prop({width: w, height: h});
    $('#nextArea').width(nw).height(nh).prop({width: nw, height: nh});
    $(document).keydown(function(e) {
        switch (e.which) {
            case 'S'.charCodeAt(0):
            case 40:
                tetris.move('d');
                break;
            case 'A'.charCodeAt(0):
            case 37:
                tetris.move('l');
                break;
            case 'D'.charCodeAt(0):
            case 39:
                tetris.move('r');
                break;
            case 'W'.charCodeAt(0):
            case 38:
                tetris.move('o');
                break;
        }
    });
    $('#reset').click(function() {
        tetris.start();
    });
    $('#pause').click(function() {
        tetris.paused = !tetris.paused;
        if (tetris.paused) {
            $(this).text('PAUSED');
            $(this).addClass('paused');
        }
        else {
            $(this).text('PAUSE');
            $(this).removeClass('paused');
        }
    });
    tetris.start();
});

tetris = {
    _w: 10,
    _h: 22,
    _g: 25,

    // Tetrominos
    _tetrominos: [
        {name: 'I', color: '#00ffff', squares: [[0, 0], [-1, 0], [1, 0], [2, 0]]},
        {name: 'J', color: '#0000ff', squares: [[0, 0], [-1, 0], [-1, -1], [1, 0]]},
        {name: 'L', color: '#ffcc00', squares: [[0, 0], [-1, 0], [1, -1], [1, 0]]},
        {name: 'O', color: '#ccff22', squares: [[0, 0], [0, -1], [1, -1], [1, 0]]},
        {name: 'S', color: '#00ff22', squares: [[0, 0], [-1, 0], [0, -1], [1, -1]]},
        {name: 'T', color: '#ff00ff', squares: [[0, 0], [-1, 0], [0, -1], [1, 0]]},
        {name: 'Z', color: '#ff0000', squares: [[0, 0], [-1, -1], [0, -1], [1, 0]]}
    ],
    bag: [],
    nextPieces: [],
    fillBag: function() {
        var sorted = [];
        this.bag = [];
        for (var i = 0; i < this._tetrominos.length; i++) {
            sorted.push(i);
        }
        while (sorted.length > 0) {
            this.bag.push(sorted.splice(parseInt(Math.random() * sorted.length), 1)[0]);
        }
    },
    popPiece: function() {
        this.nextPieces.push(this._tetrominos[this.bag.shift()]);
        this.currentPiece = JSON.parse(JSON.stringify(this.nextPieces.shift()));
        this.currentCentre = [parseInt((this._w / 2) - 0.5), 1];
        this._nextCtx.clearRect(0, 0, 4 * this._g, 10 * this._g);
        var n, p;
        for (var x = 0; x < this.nextPieces.length; x++) {
            n = this.nextPieces[x];
            p = n.squares;
            for (var i = 0; i < p.length; i++) {
                this.drawSquare(this._nextCtx, p[i][0] + 1, (x * 3) + p[i][1] + 4, n.color);
            }
        }
        if (this.bag.length == 0) {
            this.fillBag();
        }
    },

    // Movement
    occupied: [],
    occupiedColors: [],
    _movements: {
        l: function(x, y) { return [x - 1, y ]; },
        r: function(x, y) { return [x + 1, y ]; },
        d: function(x, y) { return [x, y + 1]; },
        o: function(x, y) { return [-y, x]; }
    },
    move: function(direction) {
        if (this.paused) {
            return;
        }
        var func = this._movements[direction];
        var p = this.currentPiece.squares;
        var c = this.currentCentre;
        var valid = true;
        var clear = false;
        var tr = [];
        var np = [];
        for (var i = 0; i < p.length; i++) {
            tr[i] = func(p[i][0], p[i][1]);
            np[i] = [c[0] + tr[i][0], c[1] + tr[i][1]];
            if (np[i][0] < 0 || np[i][0] >= this._w || np[i][1] >= this._h || this.occupied[np[i][1]].indexOf(np[i][0]) > -1) {
                valid = false;
            }
        }
        if (!valid) {
            if (direction == 'd') {
                for (var i = 0; i < p.length; i++) {
                    var x = c[0] + p[i][0];
                    var y = c[1] + p[i][1];
                    this.occupied[y].push(x);
                    this.occupiedColors[y].push({x: x, color: this.currentPiece.color});
                    if (this.occupied[y].length == this._w) {
                        clear = true;
                    }
                }
                if (clear) {
                    this.clearLines();
                }
                if (this.occupied[2].length > 0) {
                    this.gameOver();
                }
                this.popPiece();
            }
            return;
        }
        this.drawClearPiece();
        if (direction == 'o') {
            this.currentPiece.squares = tr;
        }
        this.currentCentre = np[0];
        this.drawPiece();
    },
    clearLines: function() {
        var newOccupied = [];
        var newOccupiedColors = [];
        for (var i = 0; i < this._h; i++) {
            newOccupied[i] = [];
            newOccupiedColors[i] = [];
        }
        var l = this._h - 1;
        for (i = this._h - 1; i > 1; i--) {
            if (this.occupied[i].length < this._w) {
                newOccupied[l] = this.occupied[i];
                newOccupiedColors[l] = this.occupiedColors[i];
                l--;
            }
        }
        var inc = l - i;
        var multiplier = Math.pow(inc, 1.5) * (1 + (parseInt(this.level) * 0.1));
        this.score += parseInt(multiplier * 100);
        this.level += inc * 0.25;
        this.occupied = newOccupied;
        this.occupiedColors = newOccupiedColors;
        this.redraw();
    },

    // Gameplay
    paused: false,
    lastTick: 0,
    start: function() {
        this.score = 0;
        this.level = 1;
        this._ctx = document.getElementById('playArea').getContext('2d');
        this._nextCtx = document.getElementById('nextArea').getContext('2d');
        for (var i = 0; i < this._h; i++) {
            this.occupied[i] = [];
            this.occupiedColors[i] = [];
        }
        this.redraw();
        this.fillBag();
        for (i = 0; i < 3; i++) {
            this.nextPieces.push(this._tetrominos[this.bag.shift()]);
        }
        this.popPiece();
        this.timer = window.requestAnimationFrame(tetris.tick);
    },
    gameOver: function() {
        window.cancelAnimationFrame(this.tick);
        this.start();
    },
    tick: function(now) {
        var tick = parseInt(now / (5000 / (parseInt(tetris.level) + 3)));
        if (tick > tetris.lastTick) {
            tetris.move('d');
        }
        tetris.lastTick = tick;
        tetris.timer = window.requestAnimationFrame(tetris.tick);
    },
    
    // Drawing
    drawClearPiece: function() {
        var p = this.currentPiece.squares;
        var c = this.currentCentre;
        for (var i = 0; i < p.length; i++) {
            this.drawClearSquare(this._ctx, c[0] + p[i][0], c[1] + p[i][1]);
        }
    },
    drawPiece: function() {
        var color = this.currentPiece.color;
        var p = this.currentPiece.squares;
        var c = this.currentCentre;
        for (var i = 0; i < p.length; i++) {
            this.drawSquare(this._ctx, c[0] + p[i][0], c[1] + p[i][1], color);
        }
    },
    drawClearSquare: function(ctx, x, y) {
        ctx.clearRect(x * this._g, (y - 2) * this._g, this._g, this._g);
    },
    drawSquare: function(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.StrokeStyle = color;
        ctx.StrokeWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x * this._g, (y - 2) * this._g, this._g, this._g);
        ctx.globalAlpha = 1;
        ctx.strokeRect(x * this._g + 1, (y - 2) * this._g + 1, this._g - 2, this._g - 2);
    },
    redraw: function() {
        this._ctx.clearRect(0, 0, this._w * this._g, this._h * this._g);
        $(this.occupiedColors).each(function(i, e) {
            $(e).each(function(j, f) {
                tetris.drawSquare(tetris._ctx, f.x, i, f.color);
            });
        });
        $('#level').text(parseInt(this.level));
        $('#score').text(this.score);
    }
}
