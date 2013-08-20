/* global cloak,Crafty,_,console,game,player */

var config;
var cardAspectRatio = 1;
var maxCardWidth = 100;
var clientWidth =  window.innerWidth;
var clientHeight =  window.innerHeight;
var gameOffsetTop = 0;
var footerHeight = 0;
var gameHeight = clientHeight - gameOffsetTop - footerHeight;

game.config.cardWidth = clientWidth / 16;
game.config.cardHeight = Math.round(game.config.cardWidth * cardAspectRatio);

if (game.config.cardWidth > Math.round(gameHeight / 15)) {
  game.config.cardWidth = Math.round(gameHeight / 15);
  game.config.cardHeight = Math.round(game.config.cardWidth * cardAspectRatio);
}

if (game.config.cardWidth > maxCardWidth) {
  game.config.cardWidth = maxCardWidth;
  game.config.cardHeight = Math.round(game.config.cardWidth * cardAspectRatio);
}

game.config.gameWidth = game.config.cardWidth * 16;
game.config.gameHeight = game.config.cardWidth * 15;
game.config.cardBuffer = game.config.cardWidth / 8;

cloak.on('connect', function() {
  console.log('connect');
});

cloak.on('disconnect', function() {
  console.log('disconnect');
});

cloak.on('begin', function(configArg) {
  console.log('begin');
  config = configArg;
  cloak.listRooms(function(rooms) {
    _(rooms).each(function(room) {
      console.log(room.name + ' (' + room.userCount + '/' + room.size + ')');
    });
    var joining = rooms[0];
    if (joining === undefined) {
      console.log('no rooms');
      return;
    }
    console.log('joining ' + joining.name);
    cloak.joinRoom(joining.id, function(success) {
      console.log(success ? 'joined' : 'failed');
    });
  });
});

cloak.run('http://localhost:8090');
game.begin();
