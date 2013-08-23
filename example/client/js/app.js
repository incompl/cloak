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


cloak.configure({
  messages: {
    'card': function(card) {
      console.log('the card:', card);
      game.drawCard.val = card.val;
      game.drawCard.suit = card.suit;
      game.drawCard.setFresh(true);
    },

    'userMessage': function(msg) {
      console.log('The server says: ' + msg);
    },

    'turn': function(msg) {
      game.turn = msg;
      console.log('Turn: ' + game.turn);
      var turnText = (game.turn === game.team) ? 'Your Turn' : 'Their Turn';
      document.getElementById('turn').innerText = turnText;
    },

    'assignTeam': function(data) {
      console.log('my team is', data.team);
      game.team = data.team;
      game.turn = data.turn;
      var turnText = (game.turn === game.team) ? 'Your Turn' : 'Their Turn';
      document.getElementById('turn').innerText = turnText;
    },

    'placedTarget': function(data) {
      //set the next card
      game.drawCard.val = data[1].val;
      game.drawCard.suit = data[1].suit;
      // find the target and simulate a click on it
      var target = _.findWhere(game.targets, {0: data[0]});
      target.placeCard();
    },

    'beginGame': function() {
      game.begin();
    },

    'theirScore': function(data) {
      var theirScoreEl = document.getElementById('theirScore');
      theirScoreEl.innerText = data.score;
    }
  },

  serverEvents: {
    'connect': function() {
      console.log('connect');
    },

    'disconnect': function() {
      console.log('disconnect');
    },

    'roomMemberJoined': function(user) {
      console.log('room member joined', user);
      cloak.listUsers(function(users) {
        game.refreshLobby(users);
      });
    },

    'roomMemberLeft': function(user) {
      console.log('room member left', user);
      cloak.listUsers(function(users) {
        game.refreshLobby(users);
      });
    },

    'begin': function() {
      console.log('begin');
      cloak.listRooms(function(rooms) {
        _(rooms).each(function(room) {
          console.log(room);
          console.log(room.name + ' (' + room.userCount + '/' + room.size + ')');
        });
      });
    }
  }

});

cloak.run('http://localhost:8090');
//game.begin();
