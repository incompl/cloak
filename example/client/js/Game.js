/* global Crafty,_,console,game,player,cloak */

window.game = (function() {
  return {
    _groupIdCounter: 0,
    _islandIdCounter: 0,
    config: {},
    room: {},

    registerUsername: function() {
      var loginUIElement = document.getElementById('login-ui');
      var loginElement = document.getElementById('login');
      if (loginElement.value.trim() === '') {
        loginUIElement.innerHTML += '<p>Enter a valid username!</p>';
        return;
      }
      game.username = loginElement.value;
      // Register our username with the server
      cloak.registerUsername(game.username, function(success) {
        console.log(success ? 'username registered' : 'username failed');
        // if we registered a username, try to join the lobby
        if (success) {
          // get the lobby
          cloak.joinLobby(function(success) {
            console.log('joined lobby');
            // list out users in the room and add them to our lobby
            cloak.listUsers(function(users) {
              console.log('other users in room', users);
              game.refreshLobby(users);
            });
          });
        }
      });
    },

    createRoom: function() {
      var newRoomElement = document.getElementById('new-room');
      var newRoomUIElement = document.getElementById('new-room-ui');
      if (newRoomElement.value.trim() === '') {
        newRoomUIElement.innerHTML += '<p>Enter a valid username!</p>';
        return;
      }
      cloak.message('createRoom', {
        name: newRoomElement.value
      });
    },

    refreshLobby: function(users) {
      console.log('refreshing lobby');
      var lobbyElement = document.getElementById('lobby'),
          lobbyListElement = document.getElementById('lobby-list'),
          newRoomUIElement = document.getElementById('new-room-ui'),
          roomsElement = document.getElementById('rooms'),
          roomListElement = document.getElementById('room-list');
      lobbyElement.style.display = 'block';
      lobbyListElement.style.display = 'block';
      newRoomUIElement.style.display = 'block';
      roomsElement.style.display = 'block';
      roomListElement.style.display = 'block';
      lobbyListElement.innerHTML = '<ul>';
      _.chain(users)
        .each(function(user) {
          if (user.room.lobby) {
            lobbyListElement.innerHTML += '<li>' + user.username + '</li>';
          }
          else {
            lobbyListElement.innerHTML += '<li>' + user.username + ' (' + user.room.userCount + '/' + user.room.size + ')</li>';
          }
        });
      lobbyListElement.innerHTML += '</ul>';

      cloak.listRooms(function(rooms) {
        roomListElement.innerHTML = '<ul>';
        _.each(rooms, function(room) {
          roomListElement.innerHTML += '<li>' + room.name + ' (' + room.userCount + '/' + room.size + ') <a href="#" onclick="game.joinRoom(\'' + room.id  + '\')">join</a><li class="indented">' + room.users[0].username + '</li></li>';
        });
        roomListElement.innerHTML += '</ul>';
      });
    },

    refreshWaiting: function() {
      cloak.getRoomMembers(game.room.id, function(members) {
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
      });
    },

    joinRoom: function(id) {
      cloak.joinRoom(id, function(success) {
        if (success) {
          game.room.id = id;
          game.begin();
          game.refreshWaiting();
        }
      });
    },

    returnToLobby: function() {
      cloak.leaveRoom(function() {
        game.end();
        game.refreshLobby();
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('network-ui').style.display = 'block';
      });
    },

    // If passed "false", hides the gameOver dialog, otherwise displays string
    showGameOver: function(msg) {
      var gameOverElement = document.getElementById('gameOver');
      var gameOverMsgElement = document.getElementById('gameOverMsg');
      if (msg === false)  {
        gameOverElement.style.display = 'none';
      }
      else {
        gameOverMsgElement.innerText = msg;
        gameOverElement.style.display = 'block';
      }
    },

    begin: function() {
      var gameUIElement = document.getElementById('game-ui');
      var gameElement = document.getElementById('game');
      gameElement.remove();
      gameElement = gameUIElement.appendChild(document.createElement('div'));
      gameElement.id = 'game';
      var infoElement = document.getElementById('info');
      var networkUIElement = document.getElementById('network-ui');
      var waitingForPlayerElem = document.getElementById('waitingForPlayer');
      gameElement.style.display = 'block';
      gameUIElement.style.display = 'block';
      infoElement.style.display = 'block';
      networkUIElement.style.display = 'none';
      waitingForPlayerElem.style.display = 'block';
      Crafty.init(game.config.gameWidth, game.config.gameHeight, gameElement);

      Crafty.background('#ddd');
      
      // Place our home target
      game.targets = [];
      game.placeHomeTarget();

      // Place our draw spot
      game.drawCard = Crafty.e('CardDrawn');
      game.drawCard.attr({
        x: game.config.cardBuffer,
        y: game.config.cardBuffer
      });

      // set up groups
      game.groups = {};
      game.groups.sum = {};
      game.groups.count = {};

      // store all the cards on the board here
      game.cards = [];

      // set up islands
      game.islands = {};
    },

    end: function() {
      // Reset score
      game.score.reset();
      // Hide game over message
      game.showGameOver(false);
      // Remove every object in the game
      Crafty('*').each(function() {
        this.destroy();
      });
    },

    score: {
      _score: {
        red: 0,
        black: 0
      },
      _el: {
        // Make two elements TODO
        score: document.getElementById('score'),
        theirScore: document.getElementById('theirScore')
      },
      get: function(suit) {
        return this._score[suit];
      },
      set: function(suit, num) {
        this._score[suit] = num;
        if (suit === game.team) {
          this._el.score.innerText = num;
        }
        else {
          this._el.theirScore.innerText = num;
        }
      },
      reset: function() {
        this._score.red = 0;
        this._score.black = 0;
      }
    },

    draw: function() {
      cloak.message('requestCard');
    },

    newGroupId: function() {
      return this._groupIdCounter++;
    },

    getGroupCards: function(group) {
      _.filter(game.cards, function(card) {
        return card.group === group;
      });
    },

    updateGroups: function() {
      game.groups.sum = {};
      game.groups.count = {};
      var groupsWithAces = [];

      _.each(game.cards, function(card) {
        if (_.has(game.groups.count,card.group)) {
          game.groups.count[card.group] += 1;
        }
        else {
          game.groups.count[card.group] = 1;
        }
        if (_.has(game.groups.sum,card.group)) {
          game.groups.sum[card.group] += card.getPoints();
        }
        else {
          game.groups.sum[card.group] = card.getPoints();
        }
        // Keep note of groups that have aces in them
        if (card.getPoints() === 11) {
          groupsWithAces.push(card.group);
        }
      }.bind(this));
      // Check to see if groups with aces are "bust", if so, revalue ace -> 1
      // This works even if there are two aces in a group. If sum is
      // over 31: 32 becomes 12, but if sum is 30 it only becomes 20
      _.each(groupsWithAces, function(group) {
        if (game.groups.sum[group] > 21) {
          game.groups.sum[group] -= 10;
        }
      }.bind(this));
    },

    newIslandId: function() {
      return this._islandIdCounter++;
    },

    updateIslands: function() {
      this._islandIdCounter = 0;
      game.islands = {};
      // first go through every card and update its island value
      _.each(game.cards, function(card) {
        card.island = game.newIslandId();
        card.evaluateIsland();
      }.bind(this));
      // now that the board is updated we can evaluate island card counts
      _.each(game.cards, function(card) {
        if (_.has(game.islands, card.island)) {
          game.islands[card.island] += 1;
        }
        else {
          game.islands[card.island] = 1;
        }
      }.bind(this));
      var largestIsland = _.max(_.pairs(game.islands), function(el) { return el[1]; })[0];
      // tag every island that's not the largest as a group to remove
      var groupsToRemove = _.chain(game.islands)
                              .omit(largestIsland)
                              .keys()
                              .value();
      game.removeById(groupsToRemove, 'island');
    },

    removeAndScore: function() {
      var groupsToRemove = [];
      _.each(game.groups.sum, function(val, key) {
        var groupSuit = _.filter(game.cards, function(el) {
          return el.group+'' === key;
        })[0].suit;
        if (val === 21) {
          groupsToRemove.push(key);
          game.score.set(groupSuit, game.score.get(groupSuit) + 10);
        }
      });
      game.removeById(groupsToRemove, 'group');
      // Weirdly, this triggers "too soon" sometimes so I put in this timeout
      setTimeout(game.refreshTargets, 0);
      game.updateIslands();
      game.refreshTargets();
      game.updateGroups();
    },

    finalScore: function() {
      this.removeAndScore();
      // If it's a tie game, run tiebreaker logic
      if (game.score.get(game.team) === game.score.get(game.otherTeam)) {
        _.each(game.groups.sum, function(val, key) {
          var groupSuit = _.filter(game.cards, function(el) {
            return el.group+'' === key;
          })[0].suit;
          if (val === 22 || val === 20) {
            game.score.set(groupSuit, game.score.get(groupSuit) + 5);
          }
          if (val === 23 || val === 19) {
            game.score.set(groupSuit, game.score.get(groupSuit) + 2);
          }
        });
      }
    },

    removeById: function(groupsToRemove, property) {
      _.each(game.cards, function(card) {
        if (_.contains(groupsToRemove, card[property]+'')) {
          card.destroy();
          game.cards = _.reject(game.cards, function(thisCard) { return _.isEqual(thisCard, card); });
        }
      });
    },

    refreshTargets: function() {
      Crafty('Target').each(function() {
        this.refresh();
      });
      // if we have no targets at all left, place a target in the middle.
      if (_.isEmpty(game.groups.sum)) {
        setTimeout(game.placeHomeTarget(),0);
      }
    },

    placeHomeTarget: function() {
      var home = Crafty.e('Target');
      home.attr({
        x: game.config.gameWidth/2 - home.w,
        y: game.config.gameHeight/2 - home.h
      });
    }
  };
})();
