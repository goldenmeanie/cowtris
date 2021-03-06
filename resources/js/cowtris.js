/*jslint white: true */
/*global Image: true */
/*global document: true */
/*global window: true */
/*global $: true */
/*global Audio: true */
/*jslint es5: true */
/*global localStorage: true */

/*
 * Copyright 2012-2013 by Ben Jacobs <benmillerj@gmail.com>. Released under the
 * terms of the GNU Public License.
 *
 * Based on concept/code (copyright 2000-2003 under the terms of the GPL) by
 * David Glick <dglick@gmail.com> The original game, and source, can be found
 * at http://nonsense.wglick.org/cowtris.html
 */

var CONSTANTS = {
    num_cols: 10,
    num_rows: 22,
    block_size: 20,
    game_area_color: 'rgb(213, 204, 187)'
    };

// Here the pieces are defined, one line per piece. The first 2 values in each
// line are the x and y coordinates for the center of the piece when it starts.
// The other 4 pairs give the x- and y-offsets of each block from the center of
// the piece.

var NormalCowDef = [
    5, 0, -1, 0, 0, 0, 1, 0, 2, 0, // Guernsey
    5, 1, -1, -1, -1, 0, 0, 0, 1, 0, // AberdeenAngus
    5, 1, 1, -1, -1, 0, 0, 0, 1, 0, // Ayrshire
    5, 1, -1, -1, 0, -1, 0, 0, 1, 0, // Hereford
    5, 1, 0, -1, 1, -1, -1, 0, 0, 0, // Jersey
    5, 0, -1, 0, 0, 0, 1, 0, 0, 1, // TexasLonghorn
    5, 1, 0, -1, 1, -1, 0, 0, 1, 0 // Holstein
    ];

var SpecialCowDef = [
    5, 1, 0, 0, 0, 0, 0, 0, 0, 0, // MadCow
    5, 1, 0, 0, 0, 0, 0, 0, 0, 0, // HolyCow
    5, 1, 0, 0, 0, 0, 0, 0, 0, 0 // PurpleCow
    ];

var CowDef = NormalCowDef;

var Rotation_Names = {
    RotNormal: 0,
    RotRight: 1,
    RotFlipped: 2,
    RotLeft: 3
    };

var Breeds = {
    'Guernsey': 0,
    'Aberdeen Angus': 1,
    'Ayrshire': 2,
    'Hereford': 3,
    'Jersey': 4,
    'Texas Longhorn': 5,
    'Holstein': 6,
    'Mad Cow': 7,
    'Holy Cow': 8,
    'Purple Cow': 9
    };

// NAME, SCORE, NUMBER OF ROWS
var DefaultHighScores = [
    ['The Mad Cow', 200000, 220],
    ['Bob', 175000, 205],
    ['Holy Cow!', 150000, 190],
    ['moooooooooooooooooooooooooooo!', 125000, 175],
    ['David', 100000, 160],
    ['Jonathan', 75000, 130],
    ['Jonny', 50000, 115],
    ['Kyle Lord of Darkness', 40000, 105],
    ['The Ultimate Pickle', 30000, 90],
    ['hello', 20000, 70],
    ['Fred', 10000, 50],
    ['gtup05 k5980gnv5t eklt', 5000, 30],
    ['a purple cow', 3000, 20],
    [':)', 1000, 10],
    ['Mr. Anonymous Guy', 500, 5],
    ];

// these could be functions, but this is pretty quick
var Breed_Names = Object.keys(Breeds);

var CowMap = new Image();
CowMap.src = './resources/images/source.png';

var NextCows = new Image();
NextCows.src = './resources/images/next.png';

// audio
var channel_max = 10;
var channels = [];
var a;
for (a = 0; a < channel_max; a += 1) {
    channels[a] = [];
    channels[a].channel = new Audio();
    channels[a].finished = -1;
}

function play_sound(s) {
    for (a = 0; a < channels.length; a+=1) {
        var thistime = new Date();
        if (channels[a].finished < thistime.getTime()) {
            channels[a].finished = thistime.getTime() + document.getElementById('audio_' + s).duration*1000;
            channels[a].channel.src = document.getElementById('audio_' + s).src;
            channels[a].channel.load();
            channels[a].channel.play();
            break;
        }
    }
}

function Point (x, y) {
    this.x = x;
    this.y = y;
}

function Cow(breed) {
    this.rotation = Rotation_Names.RotNormal;

    this.breed = breed;

    this.name = Breed_Names[this.breed];

    this.special = false;

    this.center = (function (breed) {
        return new Point(CowDef[10 * breed], CowDef[10 * breed + 1]);
    }(breed));

    this.offsets = (function (breed) {
        var offsets = [], i;

        for(i = 0; i <= 3; i += 1) {
            offsets.push(
                new Point(CowDef[10 * breed + 2 + 2 * i], CowDef[10 * breed + 3 + 2 * i])
                );
        }

        return offsets;
    }(breed));

    this.rotate = function () {
        var i;
        this.rotation = (this.rotation + 1) % 4;

        for (i = 0; i <= 3; i+=1) {
            var x = this.offsets[i].x, y = this.offsets[i].y;

            this.offsets[i].x = -y;
            this.offsets[i].y = x;
        }
    };

    this.move_right = function () {
        this.center = new Point(this.center.x + 1, this.center.y);
    };

    this.move_left = function () {
        this.center = new Point(this.center.x - 1, this.center.y);
    };

    this.advance = function () {
        this.center = new Point(this.center.x, this.center.y + 1);
    };

    this.clone = function () {
        var cow = new Cow(this.breed);
        cow.center = new Point(this.center.x, this.center.y);
        cow.rotation = this.rotation;
        cow.offsets = this.offsets.map(function(elem) {
            return new Point(elem.x, elem.y);
        });

        return cow;
    };
}

Cow.prototype = {
    get positions() {
        var cow = this;

        return cow.offsets.map(function(p) {
            return new Point(p.x + cow.center.x, p.y + cow.center.y);
        });
    },
    set positions(value) {
        return false;
    }
};

var Board = function () {
    this.canvas = document.getElementById('game_canvas');
    this.canvas.width = CONSTANTS.num_cols * CONSTANTS.block_size;
    this.canvas.height = CONSTANTS.num_rows * CONSTANTS.block_size;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = CONSTANTS.game_area_color;
    this.ctx.fillRect(0, 0, CONSTANTS.block_size * CONSTANTS.num_cols, CONSTANTS.block_size * CONSTANTS.num_rows);

    this.dropping = false;

    this.dropHeight = -1;

    this.board = (function () {
        var empty_board = [], i;
        for(i = 0; i < CONSTANTS.num_rows; i++) {
            var line = [], l;
            for (l = 0; l < CONSTANTS.num_cols; l++) {
                line[l] = 0;
            }
            empty_board.push(line);
        }
        return empty_board;
    }());

    this.aboveImage = document.createElement('canvas');
    this.aboveImage.width = this.canvas.width;

    this.belowImage = document.createElement('canvas');
    this.belowImage.width = this.canvas.width;

    this.parent = {};

    this.drawCow = function(cow) {
        var i;
        for (i = 0; i < cow.positions.length; i++) {
           var block_size = CONSTANTS.block_size, point = cow.positions[i];

            // PREFIXES: 'S' IS FOR 'SOURCE' AND 'D' IS FOR 'DESTINATION'
            // DRAWIMAGE(IMAGE, SX, SY, SWIDTH, SHEIGHT, DX, DY, DWIDTH, DHEIGHT)
            this.ctx.drawImage(CowMap,
                (i + 4 * cow.rotation) * block_size,
                cow.breed * block_size,
                block_size,
                block_size,
                point.x * block_size,
                point.y * block_size,
                block_size,
                block_size);
        }
    };

    this.eraseCow = function(cow) {
        var self = this;

        cow.positions.forEach(function(p) {
            self.ctx.fillStyle = CONSTANTS.game_area_color;
            self.ctx.fillRect(
                p.x * CONSTANTS.block_size,
                p.y * CONSTANTS.block_size,
                CONSTANTS.block_size,
                CONSTANTS.block_size);
        });
    };

    this.isConflicted = function(cow) {
        var isConflicted = false, self = this;

        cow.positions.forEach(function(p) {
            if (p.x >= CONSTANTS.num_cols || p.x < 0) {
                isConflicted = true;
            } else if (p.y >= CONSTANTS.num_rows) {
                isConflicted = true;
            } else if (self.board[p.y][p.x] === 1) {
                isConflicted = true;
            }
        });

        return isConflicted;
    };

    this.addToBoard = function(cow) {
        var i, self = this;

        cow.positions.forEach(function (p) {
            self.board[p.y][p.x] = 1;
        });

        this.parent.clearDrop();

        this.checkRowCompletions();
    };

    this.logBoard = function() {
        return this.board.map(function(row) {
            return row.map(function(point) {
                return String(point);
            });
        }).join('\n');
    };

    this.checkRowCompletions = function (Num_Zapped) {
        var full_rows = [],
            row_num,
            recurse = false,
            num_zapped = Num_Zapped || 0;

        for (row_num = 0; row_num < this.board.length; row_num++) {
            var col_num = this.board[row_num].length, sum = 0;
            while (col_num--) {
                sum += this.board[row_num][col_num];
            }
            if (sum === CONSTANTS.num_cols) {
                recurse = true;
                this.zapRow(row_num);
                break;
            }
        }

        if (recurse) {
            this.checkRowCompletions(num_zapped + 1);
        } else {
            this.parent.rowCompletionsFinished(num_zapped);
        }
    };

    this.zapRow = function(row_num) {
        var i, line = [];

        for (i = 0; i < CONSTANTS.num_cols; i+=1) {
            line[i] = 0;
        }

        this.board.splice(row_num, 1);
        this.board.unshift(line);

        this.aboveImage.height = row_num * CONSTANTS.block_size;

        this.ctx = this.aboveImage.getContext('2d');
        this.ctx.drawImage(this.canvas, 0, 0, this.aboveImage.width, this.aboveImage.height, 0, 0, this.aboveImage.width, this.aboveImage.height);

        if( row_num + 1 < CONSTANTS.num_rows ) {
            this.belowImage.height = (CONSTANTS.num_rows - row_num - 1) * CONSTANTS.block_size;

            this.ctx = this.belowImage.getContext('2d');
            this.ctx.drawImage(this.canvas,
                0,
                this.canvas.height - this.belowImage.height,
                this.belowImage.width,
                this.belowImage.height,
                0,
                0,
                this.belowImage.width,
                this.belowImage.height);
        } else {
            this.belowImage.height = 0;
        }

        // reset canvas
        this.ctx = this.canvas.getContext('2d');
        this.ctx.fillStyle = CONSTANTS.game_area_color;
        this.ctx.fillRect(0, 0, CONSTANTS.block_size * CONSTANTS.num_cols, CONSTANTS.block_size * CONSTANTS.num_rows);

        this.ctx.drawImage(this.aboveImage,
            0,
            0,
            this.aboveImage.width,
            this.aboveImage.height,
            0,
            this.canvas.height - (this.belowImage.height + this.aboveImage.height),
            this.aboveImage.width,
            this.aboveImage.height);

        if( row_num + 1 < CONSTANTS.num_rows ) {
            this.ctx.drawImage(this.belowImage,
                0,
                0,
                this.belowImage.width,
                this.belowImage.height,
                0,
                this.canvas.height - this.belowImage.height,
                this.belowImage.width,
                this.belowImage.height);
        }
    };
};

function Preview () {
    this.preview = document.getElementById('preview');

    this.previewContext = this.preview.getContext('2d');
    this.previewContext.fillStyle = 'rgb(221, 204, 187)';
    this.previewContext.fillRect(0,0, 84, 52);

    this.drawCow = function (cow) {
        this.previewContext.drawImage(NextCows, 0, (cow.breed) * 40, 80, 40, 4, 6, 80, 40);

        document.getElementById('preview_name').innerHTML = cow.name;
    };
}

function Game () {
    this.playing = false;
    this.interval = null;
    this.piece = null;
    this.nextPiece = null;
    this.dropIntervalID = null;
    this.score = 0;
    this.rows = 0;
    this.board = null;
    this.oldBoard = null;
    this.preview = null;
    this.pausedInterval = null;
    this.level = 0;
    this.startLevel = 0;
    this.startRows = 0;
    this.gameTimer = $.timer((function(self) {
        return function () {
            self.advancePiece();
        };
    }(this)));
    this.highScores = (function () {
      var highScores = [];
      if (!localStorage.highScores) {
        highScores = DefaultHighScores;
        localStorage.highScores = JSON.stringify(highScores);
      } else if (JSON.parse(localStorage.highScores)) {
        highScores = JSON.parse(localStorage.highScores);
      }
      return highScores;
    }());
    this.drawHighScoreTable = function () {
      var tb = $('#highScoreModal table > tbody'), bod = '';
      $(this.highScores).each(function(index, row) {
        var tr = '<td>' + (index + 1) + '</td>';
        $(row).each(function(i, cell) {
          tr = tr + '<td>' + cell + '</td>';
        });
        tr = '<tr>' + tr + '</tr>';
        bod = bod + tr;
      });
      $(tb).html(bod);
    };
    this.drawHighScoreTable();

    this.clearDrop = function () {
        clearInterval(this.dropIntervalID);
    };

    this.advancePiece = function () {
        if (!this.gameTimer.isActive) {
            return;
        }

        var provisional = this.piece.clone();
        provisional.advance();

        if (this.board.isConflicted(provisional)) {
            this.board.addToBoard(this.piece);
            this.newPiece();
        } else {
            this.board.eraseCow(this.piece);
            this.piece.advance();
            this.board.drawCow(this.piece);
        }
    };

    this.newGamePressed = function () {
        if (!this.gameTimer.isActive) {
            return;
        }
        this.newGame();
    };

    this.movePieceRight = function () {
        if (!this.gameTimer.isActive) {
            return;
        }

        var provisional = this.piece.clone();
        provisional.move_right();

        if ( !this.board.isConflicted(provisional) ) {
            this.board.eraseCow(this.piece);
            this.piece.move_right();
            this.board.drawCow(this.piece);
        }
    };

    this.movePieceLeft = function () {
        if (!this.gameTimer.isActive) {
            return;
        }

        var provisional = this.piece.clone();
        provisional.move_left();

        if (!this.board.isConflicted(provisional)) {
            this.board.eraseCow(this.piece);
            this.piece.move_left();
            this.board.drawCow(this.piece);
        }
    };

    this.dropPiece = function () {
        if (!this.gameTimer.isActive) {
            return;
        }

        this.dropIntervalID = setInterval( (function(self) {
            return function () {
              self.advancePiece();
          };
      }(this)), 10);
    };

    this.rotatePiece = function () {
        if (!this.gameTimer.isActive) {
            return;
        }

        var provisional = this.piece.clone();
        provisional.rotate();

        if (!this.board.isConflicted(provisional)) {
            this.board.eraseCow(this.piece);
            this.piece.rotate();
            this.board.drawCow(this.piece);
        }
    };

    this.gameOver = function () {
        this.gameTimer.stop();
        this.playing = false;
        $('#game_over').show();
        play_sound('gameover');
        this.checkIfHighScore();
    };

    this.rowCompletionsFinished = function (num_rows_zapped) {
        this.updateLevel(num_rows_zapped);
        this.increaseScore(num_rows_zapped);
        this.increaseRowsCount(num_rows_zapped);
        if (num_rows_zapped > 1) {
            play_sound('multirow');
        } else if (num_rows_zapped === 1) {
            play_sound('row');
        }
    };

    this.updateLevel = function (num_rows_zapped) {
        if(Math.floor(((this.rows + num_rows_zapped) / 10)) === this.level + 1) {
            this.level += 1;

            this.interval = 1000 * (0.5 - (0.0472 * this.level));

            this.gameTimer.set({ time: this.interval });

            $('#level').text(this.level);
        }
    };

    this.increaseRowsCount = function (num_rows_zapped) {
        this.rows = this.rows + num_rows_zapped;
        $('#rows').text(this.rows);
    };

    this.increaseScore = function (num_rows_zapped) {
        if (num_rows_zapped === 1) {
            this.score += 50 * (this.level + 1);
        } else if (num_rows_zapped === 2) {
            this.score += 150 * (this.level + 1);
        } else if (num_rows_zapped === 3) {
            this.score += 500 * (this.level + 1);
        } else if (num_rows_zapped === 4) {
            this.score += 1000 * (this.level + 1);
        }
        document.getElementById('score').innerText = String(this.score);
    };

    this.newPiece = function () {
        this.piece = this.nextPiece.clone();

        this.nextPiece = new Cow(Math.floor(Math.random() * 7));

        this.preview.drawCow(this.nextPiece);

        if (this.board.isConflicted(this.piece)) {
            this.gameOver();
        } else {
            this.board.drawCow(this.piece);
        }
    };

    this.pause = function () {
        if (!this.playing) {
            return;
        }
        $('#paused').toggle();
        this.gameTimer.toggle();
    };

    this.newGame = function () {
        this.playing = true;
        this.level = this.startLevel;
        this.interval = 1000 * (0.5 - (0.0472 * this.level));
        this.piece = new Cow(Math.floor(Math.random() * 7));
        this.nextPiece = new Cow(Math.floor(Math.random() * 7));
        this.board = new Board();
        this.oldBoard = new Board();
        this.preview = new Preview();
        this.board.parent = this;
        this.board.drawCow(this.piece);
        this.preview.drawCow(this.nextPiece);
        this.score = 0;
        this.rows = 0;

        this.gameTimer.set({ time: this.interval, autostart: true });

        $('#paused').hide();
        $('#game_over').hide();
        $('#level').text(this.level);
        $('#score').text(this.score);
        $('#rows').text(this.rows);
    };

    this.checkIfHighScore = function () {
      var newHS = [],
        newIndex = -1,
        newScore = ['', this.score, this.rows],
        alreadyAdded = false,
        self = this;

      $(self.highScores).each(function(index,value) {
        if (newScore[1] > value[1] && !alreadyAdded) {
          newHS.push(newScore);
          newIndex = index + 1;
          alreadyAdded = true;
        }
        newHS.push(value);
      });
      newHS.pop();

      if (newHS !== self.highScores) {
        self.highScores = newHS;
        self.drawHighScoreTable();
        $('#highScoreModal tbody').find('tr:nth-child(' + newIndex + ')')
          .find('td:nth-child(2)')
          .html('<input type="text" />');
      }

      $('#highScoreModal').modal('show');
      $('#highScoreModal').on('shown', function () {
        $('#highScoreModal input')
          .focus()
          .on('blur', function(event) {
            self.highScores[newIndex - 1][0] = $(this).val();
            self.drawHighScoreTable();
            localStorage.highScores = JSON.stringify(self.highScores);
          });
      });
    };
}

function AppInitialize() {
    var game = new Game();

    // key presses
    $('body').keydown(function (e) {
        switch(e.keyCode) {
            case 32: // space
                e.preventDefault();
                game.dropPiece();
                break;
            case 37: // left
                e.preventDefault();
                game.movePieceLeft();
                break;
            case 38:
                e.preventDefault();
                game.rotatePiece();
                break;
            case 39: // right
                e.preventDefault();
                game.movePieceRight();
                break;
            case 40: // down
                e.preventDefault();
                game.advancePiece();
                break;
            case 78:
                e.preventDefault();
                game.newGamePressed();
                break;
            case 80: // 'p'
                e.preventDefault();
                game.pause();
                break;
        }
    });

    // menu selectors
    $('#pauseAction').click(function (event) {
        event.preventDefault();
        game.pause();
    });

    $('#newGameAction').click(function (event) {
        event.preventDefault();
        game.newGame();
    });

    $('#startingLevel').change(function (event) {
        game.startLevel = parseInt($(this).val(), 10);
    });

    // THIS GIVES DESIRED EFFECT WHEN CLICKING MENU, BUT NOT WHEN CLICKING OFF

    // $(window).focusout(function(e) {
    //     game.pause();
    // }).focusin(function(e) {
    //     game.pause();
    // });

    game.newGame();
    play_sound('madcow');
}
