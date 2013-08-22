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

    'assignTeam': function(team) {
      console.log('my team is', team);
      game.team = team;
    },

    'placedTarget': function(data) {
      console.log('target was:', data);
      //set the next card
      game.drawCard.val = data[1].val;
      game.drawCard.suit = data[1].suit;
      // find the target and simulate a click on it
      var target = _.findWhere(game.targets, {0: data[0]});
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

    'begin': function() {
      console.log('begin');
      cloak.listRooms(function(rooms) {
        _(rooms).each(function(room) {
          console.log(room);
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
          var lobbyElement = document.getElementById('lobby');
          if (joining.users.length === 0) {
            console.log('no other users');
          }
          lobbyElement.innerHTML = '<ul>';
          _.each(joining.users, function(id) {
            console.log('user: ' + id);
            lobbyElement.innerHTML += '<li>' + id + '</li>';
          });
          lobbyElement.innerHTML += '</ul>';
        });
      });
    }
  }

});

cloak.run('http://10.0.0.213:8090');
//game.begin();
