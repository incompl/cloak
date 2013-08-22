/* global Crafty,_,console,game,player,cloak */

window.game = (function() {
  return {
    _groupIdCounter: 0,
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
      var turnElement = document.getElementById('turn');
      var networkUIElement = document.getElementById('network-ui');
      gameElement.style.display = 'block';
      turnElement.style.display = 'block';
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

      game.groups = {};
      game.groups.sum = {};
      game.groups.count = {};
      game.cards = [];
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
        if (game.groups.count.hasOwnProperty(card.group)) {
          game.groups.count[card.group] += 1;
        }
        else {
          game.groups.count[card.group] = 1;
        }
        if (game.groups.sum.hasOwnProperty(card.group)) {
          game.groups.sum[card.group] += card.getPoints();
        }
        else {
          game.groups.sum[card.group] = card.getPoints();
        }
      }.bind(this));
    },

    removeAndScore: function() {
      var groupsToRemove = [];
      _.each(game.groups.sum, function(val, key) {
        if (val === 21) {
          groupsToRemove.push(+key);
        }
      });
      _.each(game.cards, function(card) {
        if (_.contains(groupsToRemove, card.group)) {
          card.destroy();
          game.cards = _.reject(game.cards, function(thisCard) { return _.isEqual(thisCard, card); });
        }
      });
      // Weirdly, this triggers "too soon" sometimes so I put in this timeout
      setTimeout(game.refreshTargets, 0);
      game.updateGroups();
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
