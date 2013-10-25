/* global cloak,Crafty,_,console,game,player */

var config;
var cardAspectRatio = 1;
var maxCardWidth = 100;
var clientWidth =  window.innerWidth;
var clientHeight =  window.innerHeight;
var gameOffsetTop = 0;
var footerHeight = 0;
var gameHeight = clientHeight - gameOffsetTop - footerHeight;
var gameElement = document.getElementById('game');

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
    'roomCreated': function(room) {
      cloak.joinRoom(room.id, function(success) {
        console.log(success ? 'room join success' : 'room join failure');
        if (success) {
          game.room.id = room.id;
          game.begin();
        }
      });
    },

    'cardsLeft': function(cardsLeft) {
      document.getElementById('cardsLeft').innerText = cardsLeft;
    },

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
      game.refreshWaiting();
    },

    'gameOver': function() {
      var msg = '';
      var myOldScore = game.score.get(game.team);
      var theirOldScore = game.score.get(game.otherTeam);
      game.finalScore();
      var myTiebreaker = game.score.get(game.team) - myOldScore;
      var theirTiebreaker = game.score.get(game.otherTeam) - theirOldScore;
      if (game.score.get(game.team) > game.score.get(game.otherTeam)) {
        msg = 'YOU WIN';
      }
      else if (game.score.get(game.team) < game.score.get(game.otherTeam)) {
        msg = 'YOU LOSE';
      }
      else {
        msg = 'TIE GAME';
      }

      // append tiebreaker text
      if (myTiebreaker > 0 || theirTiebreaker > 0) {
        msg +=  '\nTiebreaker!' +
                '\nBase scores: ' + myOldScore +
                '\nYour tiebreaker: ' + myTiebreaker +
                '\nTheir tiebreaker: ' + theirTiebreaker;
      }
      game.showGameOver(msg);
    },

    'assignTeam': function(data) {
      console.log('my team is', data.team);
      game.team = data.team;
      game.otherTeam = (game.team === 'red') ? 'black' : 'red';
      game.turn = data.turn;
      var turnText = (game.turn === game.team) ? 'Your Turn' : 'Their Turn';
      document.getElementById('turn').innerText = turnText;
    },

    'placedTarget': function(data) {
      console.log('target data', data);
      //set the next card
      game.drawCard.val = data[1].val;
      game.drawCard.suit = data[1].suit;
      // find the target and place the drawn card on it
      var target = _.findWhere(game.targets, {targetId: data[0]});
      target.placeCard();
    }
  },

  serverEvents: {
    'connect': function() {
      console.log('connect');
    },

    'disconnect': function() {
      console.log('disconnect');
    },

    'lobbyMemberJoined': function(user) {
      console.log('lobby member joined', user);
      cloak.listUsers(function(users) {
        game.refreshLobby(users);
      });
    },

    'lobbyMemberLeft': function(user) {
      console.log('lobby member left', user);
      cloak.listUsers(function(users) {
        game.refreshLobby(users);
      });
    },

    'roomMemberJoined': function(user) {
      console.log('room member joined', user);
      game.refreshWaiting();
    },

    'roomMemberLeft': function(user) {
      console.log('room member left', user);
      // The other player dropped, so we need to stop the game and show return to lobby prompt
      game.showGameOver('The other player disconnected!');
      cloak.leaveRoom(function() {
        console.log('Removing you from the room because the other player disconnected.');
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

Crafty.init(game.config.gameWidth, game.config.gameHeight, gameElement);
cloak.run('http://localhost:8090');
