/* global Crafty,_,console,game,player,cloak */

window.game = (function() {
  return {
    _groupIdCounter: 0,
    _islandIdCounter: 0,
    config: {},

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
      cloak.createRoom({
        name: newRoomElement.value,
        size: 2
      }, function(room) {
        cloak.joinRoom(room.id, function(success) {
          console.log(success ? 'room join success' : 'room join failure');
          if (success) {
            game.begin();
          }
        });
      });
    },

    refreshLobby: function(users) {
      console.log('refreshing lobby');
      var lobbyElement = document.getElementById('lobby');
      var newRoomUIElement = document.getElementById('new-room-ui');
      var roomsElement = document.getElementById('rooms');
      lobbyElement.style.display = 'block';
      newRoomUIElement.style.display = 'block';
      roomsElement.style.display = 'block';
      lobbyElement.innerHTML = '<h3>Lobby</h3><ul>';
      _.chain(users)
        .each(function(user) {
          if (user.room.lobby) {
            lobbyElement.innerHTML += '<li>' + user.username + '</li>';
          }
          else {
            lobbyElement.innerHTML += '<li>' + user.username + ' (' + user.room.userCount + '/' + user.room.size + ')</li>';
          }
        });
      lobbyElement.innerHTML += '</ul>';

      cloak.listRooms(function(rooms) {
        roomsElement.innerHTML = '<h3>Rooms</h3><ul>';
        _.each(rooms, function(room) {
          roomsElement.innerHTML += '<li>' + room.name + ' (' + room.userCount + '/' + room.size + ') <a href="#" onclick="game.joinRoom(\'' + room.id  + '\')">join</a><li class="indented">' + room.users[0].username + '</li></li>';
        });
        roomsElement.innerHTML += '</ul>';
      });
    },

    joinRoom: function(id) {
      cloak.joinRoom(id, function(success) {
        if (success) {
          game.begin();
        }
      });
    },

    begin: function() {
      var gameElement = document.getElementById('game');
      var infoElement = document.getElementById('info');
      var networkUIElement = document.getElementById('network-ui');
      gameElement.style.display = 'block';
      infoElement.style.display = 'block';
      networkUIElement.style.display = 'none';
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
      Crafty.stop(true);
      var gameUIElement = document.getElementById('game-ui');
      var networkUIElement = document.getElementById('network-ui');
      gameUIElement.style.display = 'none';
      networkUIElement.style.display = 'block';
    },

    score: {
      _score: 0,
      _el: document.getElementById('score'),
      get: function() {
        return this._score;
      },
      set: function(num) {
        this._el.innerText = num;
        this._score = num;
        cloak.message('score', this._score);
      }
    },

    draw: function() {
      cloak.message('requestCard');
    },

    newGroupId: function() {
      return this._groupIdCounter++;
    },

    updateGroups: function() {
      game.groups.sum = {};
      game.groups.count = {};
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
          if (groupSuit === game.team) {
            game.score.set(game.score.get() + 10);
          }
        }
      });
      game.removeById(groupsToRemove, 'group');
      // Weirdly, this triggers "too soon" sometimes so I put in this timeout
      setTimeout(game.refreshTargets, 0);
      game.updateIslands();
      game.refreshTargets();
      game.updateGroups();
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
