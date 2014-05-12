$(document).ready(function() {
    var w = tetris.options.w * tetris.options.g, h = (tetris.options.h - 2) * tetris.options.g, nw = 4 * tetris.options.g, nh = 10 * tetris.options.g, k = tetris.options.keys();
    $('#playArea').width(w).height(h).prop({width: w, height: h});
    $('#nextArea').width(nw).height(nh).prop({width: nw, height: nh});
    $(document).keydown(function(e) {
        if (k.hasOwnProperty(e.which)) {
            k[e.which].action();
            e.preventDefault();
        }
    });
    $('#start').click(function() {
        tetris.start();
    });
    $('#pause').click(function() {
        tetris.togglePause();
    });
    tetris.start();
});

tetris = {
    options: {
        // Keyboard configuration
        // Returns: {int keycode: {string name, function() action}, ...}
        keys: function() {
            var k = {};
            k['R'.charCodeAt(0)] = {name: 'Start', action: function() { tetris.start(); }};
            k['P'.charCodeAt(0)] = {name: 'Pause', action: function() { tetris.togglePause(); }};
            k['S'.charCodeAt(0)] = {name: 'Move down', action: function() { tetris.move('d'); }};
            k['A'.charCodeAt(0)] = {name: 'Move left', action: function() { tetris.move('l'); }};
            k['D'.charCodeAt(0)] = {name: 'Move right', action: function() { tetris.move('r'); }};
            k['W'.charCodeAt(0)] = {name: 'Rotate', action: function() { tetris.move('o'); }};
            k[40] = k['S'.charCodeAt(0)];
            k[37] = k['A'.charCodeAt(0)];
            k[39] = k['D'.charCodeAt(0)];
            k[38] = k['W'.charCodeAt(0)];
            return k;
        },
    
        // Dimensions
        // Values:  int
        w: 10,      // grid width, in squares
        h: 22,      // grid height, in squares (including 2 hidden rows)
        g: 25,      // grid square pixel size

        // Tetrominos
        // Returns: {string name, string color, [[int xOffset, int yOffset], ...] squares}
        tetrominos: [
            {name: 'I', color: '#00ffff', squares: [[0, 0], [-1, 0], [1, 0], [2, 0]]},
            {name: 'J', color: '#0000ff', squares: [[0, 0], [-1, 0], [-1, -1], [1, 0]]},
            {name: 'L', color: '#ffcc00', squares: [[0, 0], [-1, 0], [1, -1], [1, 0]]},
            {name: 'O', color: '#ccff22', squares: [[0, 0], [0, -1], [1, -1], [1, 0]]},
            {name: 'S', color: '#00ff22', squares: [[0, 0], [-1, 0], [0, -1], [1, -1]]},
            {name: 'T', color: '#ff00ff', squares: [[0, 0], [-1, 0], [0, -1], [1, 0]]},
            {name: 'Z', color: '#ff0000', squares: [[0, 0], [-1, -1], [0, -1], [1, 0]]}
        ],
        
        // Line highlight color
        // Values:  string color
        // Default: '#ffe87c'
        highlightColor: '#ffe87c',
        
        // Game over fill color
        // Values:  string color
        // Default: '#aaaaaa'
        gameOverColor: '#aaaaaa',
        
        // Line highlight time (ms)
        // Values:  int
        // Default: 200
        highlightTime: 200,
        
        // Drop speed
        // Values:  int (lower = faster)
        // Default: 5000
        speed: 5000,
        
        // Level speed (lines per level increase)
        // Values:  int
        // Default: 5
        levelSpeed: 5,
        
        // Next pieces to show
        // Values:  int (minimum 1)
        // Default: 3
        showNext: 3,
        
        // Automatically start after resetting?
        // Values:  bool
        // Default: true
        autostart: true,
        
        // Move modifiers
        // Params:  int x, int y
        // Returns: [int x, int y, bool orientationChanged]
        movements: {
            l: function(x, y) { return [x - 1, y, false ]; },
            r: function(x, y) { return [x + 1, y, false ]; },
            d: function(x, y) { return [x, y + 1, false ]; },
            o: function(x, y) { return [-y, x, true]; }
        },
        
        // Update score
        // Params:  int score, int linesCleared, int level
        // Returns: int newScore
        updateScore: function(score, lines, level) {
            multiplier = Math.pow(lines, 1.5) * (1 + (level * 0.1));
            return score + parseInt(multiplier * 100);
        }
    },

    fillBag: function() {
        var sorted = [], i;
        this.bag = [];
        for (i = 0; i < this.options.tetrominos.length; i++) {
            sorted.push(i);
        }
        while (sorted.length > 0) {
            this.bag.push(sorted.splice(parseInt(Math.random() * sorted.length), 1)[0]);
        }
    },
    popPiece: function() {
        var n, p, x, i;
        this.nextPieces.push(this.options.tetrominos[this.bag.shift()]);
        this.currentPiece = JSON.parse(JSON.stringify(this.nextPieces.shift()));
        this.currentCentre = [parseInt((this.options.w / 2) - 0.5), 2];
        this.drawPiece();
        this.nextCtx.clearRect(0, 0, 4 * this.options.g, ((3 * this.options.showNext) + 1) * this.options.g);
        for (x = 0; x < this.nextPieces.length; x++) {
            n = this.nextPieces[x];
            p = n.squares;
            for (i = 0; i < p.length; i++) {
                this.drawSquare(this.nextCtx, p[i][0] + 1, (x * 3) + p[i][1] + 2, n.color);
            }
        }
        if (this.bag.length == 0) {
            this.fillBag();
        }
    },

    // Movement
    occupied: [],
    occupiedColors: [],
    move: function(direction) {
        var func = this.options.movements[direction], p = this.currentPiece.squares, c = this.currentCentre, valid = true, clear = false, tr = [], np = [], i, x, y;
        if (this.paused || !this.playing || !this.acceptingInput) {
            return;
        }
        for (i = 0; i < p.length; i++) {
            tr[i] = func(p[i][0], p[i][1]);
            np[i] = [c[0] + tr[i][0], c[1] + tr[i][1]];
            if (np[i][0] < 0 || np[i][0] >= this.options.w || np[i][1] >= this.options.h || this.occupied[np[i][1]].indexOf(np[i][0]) > -1) {
                valid = false;
            }
        }
        if (!valid) {
            if (direction == 'd') {
                for (i = 0; i < p.length; i++) {
                    x = c[0] + p[i][0];
                    y = c[1] + p[i][1];
                    this.occupied[y].push(x);
                    this.occupiedColors[y].push({x: x, color: this.currentPiece.color});
                    if (this.occupied[y].length == this.options.w) {
                        clear = true;
                    }
                }
                if (clear) {
                    this.redraw();
                    this.acceptingInput = false;
                    if (this.options.highlightTime > 0) {
                        window.setTimeout(function() { window.requestAnimationFrame(tetris.clearLines); }, this.options.highlightTime);
                    }
                    else {
                        this.clearLines();
                    }
                }
                else {
                    if (this.occupied[2].length > 0) {
                        this.gameOver();
                        return;
                    }
                    this.popPiece();
                }
            }
            return;
        }
        this.drawClearPiece();
        if (tr[0][2]) {
            this.currentPiece.squares = tr;
        }
        this.currentCentre = np[0];
        this.drawPiece();
    },
    clearLines: function() {
        var newOccupied = [], newOccupiedColors = [], l = tetris.options.h - 1, i, lines, multiplier;
        for (i = 0; i < tetris.options.h; i++) {
            newOccupied[i] = [];
            newOccupiedColors[i] = [];
        }
        for (i = tetris.options.h - 1; i > 1; i--) {
            if (tetris.occupied[i].length < tetris.options.w) {
                newOccupied[l] = tetris.occupied[i];
                newOccupiedColors[l] = tetris.occupiedColors[i];
                l--;
            }
        }
        lines = l - i;
        tetris.lines += lines;
        tetris.score = tetris.options.updateScore(tetris.score, lines, tetris.level);
        tetris.level = (tetris.lines / tetris.options.levelSpeed) + 1;
        tetris.occupied = newOccupied;
        tetris.occupiedColors = newOccupiedColors;
        tetris.acceptingInput = true;
        tetris.redraw();
        if (tetris.occupied[2].length > 0) {
            tetris.gameOver();
            return;
        }
        tetris.popPiece();
    },

    // Gameplay
    lastTick: 0,
    ready: false,
    acceptingInput: false,
    reset: function() {
        var i;
        window.cancelAnimationFrame(this.timer);
        this.playing = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.ctx = document.getElementById('playArea').getContext('2d');
        this.nextCtx = document.getElementById('nextArea').getContext('2d');
        for (i = 0; i < this.options.h; i++) {
            this.occupied[i] = [];
            this.occupiedColors[i] = [];
        }
        this.redraw();
        this.fillBag();
        this.nextPieces = [];
        for (i = 0; i < this.options.showNext; i++) {
            this.nextPieces.push(this.options.tetrominos[this.bag.shift()]);
        }
        this.popPiece();
        $('#start').text('START');
        this.ready = true;
    },
    start: function() {
        if (tetris.playing || !tetris.ready) {
            tetris.reset();
            if (!tetris.options.autostart) {
                return;
            }
        }
        this.timer = window.requestAnimationFrame(tetris.tick);
        $('#start').text('RESET');
        this.playing = true;
        this.acceptingInput = true;
    },
    togglePause: function () {
        var b = $('#pause');
        if (this.paused = !this.paused) {
            b.text('PAUSED');
            b.addClass('paused');
        }
        else {
            b.text('PAUSE');
            b.removeClass('paused');
        }
    },
    gameOver: function() {
        window.cancelAnimationFrame(this.timer);
        this.playing = false;
        this.ready = false;
        this.redraw();
    },
    tick: function(now) {
        var tick = parseInt(now / (tetris.options.speed / (parseInt(tetris.level) + 3)));
        if (tick > tetris.lastTick) {
            tetris.move('d');
        }
        tetris.lastTick = tick;
        tetris.timer = window.requestAnimationFrame(tetris.tick);
    },
    
    // Drawing
    drawClearPiece: function() {
        var p = this.currentPiece.squares, c = this.currentCentre, i;
        for (i = 0; i < p.length; i++) {
            this.drawClearSquare(this.ctx, c[0] + p[i][0], c[1] + p[i][1]);
        }
    },
    drawPiece: function() {
        var color = this.currentPiece.color, p = this.currentPiece.squares, c = this.currentCentre, i;
        for (i = 0; i < p.length; i++) {
            this.drawSquare(this.ctx, c[0] + p[i][0], c[1] + p[i][1] - 2, color);
        }
    },
    drawClearSquare: function(ctx, x, y) {
        ctx.clearRect(x * this.options.g, (y - 2) * this.options.g, this.options.g, this.options.g);
    },
    drawSquare: function(ctx, x, y, color) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.fillRect(x * this.options.g + 1, y * this.options.g + 1, this.options.g - 2, this.options.g - 2);
        ctx.strokeRect(x * this.options.g + 1, y * this.options.g + 1, this.options.g - 2, this.options.g - 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * this.options.g + 3, y * this.options.g + 3, 5, 5);
    },
    redraw: function() {
        this.ctx.clearRect(0, 0, this.options.w * this.options.g, this.options.h * this.options.g);
        $(this.occupiedColors).each(function(i, e) {
            $(e).each(function(j, f) {
                tetris.drawSquare(tetris.ctx, f.x, i - 2, tetris.playing? (e.length == tetris.options.w? tetris.options.highlightColor: f.color): tetris.options.gameOverColor);
            });
        });
        $('#level').text(parseInt(this.level));
        $('#score').text(this.score);
        $('#lines').text(this.lines);
    }
}
