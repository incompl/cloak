/* global cloak,Crafty,_,console,game,player,escape */

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
    'registerUsernameResponse': function(success) {
      console.log(success ? 'username registered' : 'username failed');
      // if we registered a username, try to join the lobby
      if (success) {
        // get the lobby
        cloak.message('joinLobby');
      }
    },

    'joinLobbyResponse': function(success) {
      console.log('joined lobby');
      game.refreshLobby();
    },

    'refreshLobby': function(users) {
      var lobbyElement = document.getElementById('lobby'),
        lobbyListElement = document.getElementById('lobby-list'),
        newRoomUIElement = document.getElementById('new-room-ui'),
        roomsElement = document.getElementById('rooms'),
        roomListElement = document.getElementById('room-list');

      console.log('other users in room', users);
      lobbyElement.style.display = 'block';
      lobbyListElement.style.display = 'block';
      newRoomUIElement.style.display = 'block';
      roomsElement.style.display = 'block';
      roomListElement.style.display = 'block';
      lobbyListElement.innerHTML = '<ul>';
      _.chain(users)
        .each(function(user) {
          if (user.room.lobby) {
            lobbyListElement.innerHTML += '<li>' + escape(user.username) + '</li>';
          }
          else {
            lobbyListElement.innerHTML += '<li>' + escape(user.username) + ' (' + user.room.userCount + '/' + user.room.size + ')</li>';
          }
        });
      lobbyListElement.innerHTML += '</ul>';
    },

    'listRooms': function(rooms) {
      var roomListElement = document.getElementById('room-list');
      roomListElement.innerHTML = '<ul>';
        _.each(rooms, function(room) {
          roomListElement.innerHTML += '<li>' + escape(room.name) + ' (' + room.userCount + '/' + room.size + ') <a href="#" onclick="game.joinRoom(\'' + room.id  + '\')">join</a><li class="indented">' + room.users[0].username + '</li></li>';
        });
      roomListElement.innerHTML += '</ul>';
    },

    'joinRoomResponse': function(result) {
      if (result.success) {
        game.room.id = result.id;
        game.begin();
        game.refreshWaiting();
      }
    },

    refreshWaitingResponse: function(members) {
      if (!members) {
        return;
      }
      var waitingForPlayerElem = document.getElementById('waitingForPlayer');
      if (members.length < 2) {
        waitingForPlayerElem.style.display = 'block';
      }
      else {
        waitingForPlayerElem.style.display = 'none';
      }
    },

    'roomCreated': function(result) {
      console.log(result.success ? 'room join success' : 'room join failure');
      if (result.success) {
        game.room.id = result.roomId;
        game.begin();
      }
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
      game.updateTurn();
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
      game.updateTurn();
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
      cloak.message('listUsers');
    },

    'lobbyMemberLeft': function(user) {
      console.log('lobby member left', user);
      cloak.message('listUsers');
    },

    'roomCreated': function(rooms) {
      console.log('created a room', rooms);
      game.refreshLobby();
    },

    'roomDeleted': function(rooms) {
      console.log('deleted a room', rooms);
      game.refreshLobby();
    },

    'roomMemberJoined': function(user) {
      console.log('room member joined', user);
      game.refreshWaiting();
    },

    'roomMemberLeft': function(user) {
      console.log('room member left', user);
      // The other player dropped, so we need to stop the game and show return to lobby prompt
      game.showGameOver('The other player disconnected!');
      cloak.message('leaveRoom');
      console.log('Removing you from the room because the other player disconnected.');
    },

    'begin': function() {
      console.log('begin');
      cloak.message('listRooms');
    }
  }

});

Crafty.init(game.config.gameWidth, game.config.gameHeight, gameElement);
cloak.run('http://10.0.20.12:8090');
