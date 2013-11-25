/* global require,console,escape */

var cloak = require('../../../src/server/cloak');
var _ = require('underscore');

cloak.configure({
  // 3 hour room life
  roomLife: 1000*60*60*3,

  autoJoinLobby: false,
  minRoomMembers: 1,
  pruneEmptyRooms: 1000,
  reconnectWait: 3000,

  messages: {
    registerUsername: function(arg, user) {
      var users = cloak.getUsers();
      var username = arg.username;
      var usernames = _.pluck(users, 'username');
      var success = false;
      if (_.indexOf(usernames, username) === -1) {
        success = true;
        user.name = username;
      }
      user.message('registerUsernameResponse', success);
    },

    joinLobby: function(arg, user) {
      cloak.getLobby().addMember(user);
      user.message('joinLobbyResponse');
    },

    joinRoom: function(id, user) {
      cloak.getRoom(id).addMember(user);
      user.message('joinRoomResponse', {
        id: id,
        success: true
      });
    },

    listRooms: function(arg, user) {
      user.message('listRooms', cloak.listRooms());
    },

    listUsers: function(arg, user) {
      user.message('refreshLobby', user.room.getMembers());
    },

    refreshWaiting: function(arg, user) {
      user.message('refreshWaitingResponse', user.room.getMembers());
    },

    leaveRoom: function(arg, user) {
      user.leaveRoom();
    },

    listUsersResponse: function(arg, users) {
      console.log('other users in room', users);
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
            lobbyListElement.innerHTML += '<li>' + escape(user.name) + '</li>';
          }
          else {
            lobbyListElement.innerHTML += '<li>' + escape(user.name) + ' (' + user.room.userCount + '/' + user.room.size + ')</li>';
          }
        });
      lobbyListElement.innerHTML += '</ul>';
    },

    createRoom: function(arg, user) {
      var room = cloak.createRoom(arg.name, 2);
      var success = room.addMember(user);
      user.message('roomCreated', {
        success: success,
        roomId: room.id
      });
    },

    requestCard: function(arg, user) {
      var card = user.room.deck.draw(user.team);
      user.room.lastCard = card;
      user.message('card', card);
      user.message('cardsLeft', user.room.deck[user.team].length);
    },

    turnDone: function(targetId, user) {
      // If it's currently the turn of the user and they say they're done, advance the turn
      if (user.team === user.room.turn) {
        user.room.turn = (user.room.turn === 'red') ? 'black' : 'red';
      }
      // let the other player know
      var otherPlayer = _.reject(user.room.members, function(member) {
        return member.id === user.id;
      });
      otherPlayer[0].message('placedTarget', [targetId, user.room.lastCard]);
      // if the deck is completely empty, that's the end of the game!
      if (user.room.deck.black.length === 0 && user.room.deck.red.length === 0) {
        user.room.messageMembers('gameOver');
      }
      else {
        // otherwise let the users know what turn it is
        user.room.messageMembers('turn', user.room.turn);
      }
    }
  },

  room: {
    init: function() {
      this.turn = 'red';
      this.lastCard = {};

      this.teams = {
        red: '',
        black: ''
      };

      this.deck = {
        red: [],
        black: [],
        draw: function(suit) {
          var index = Math.floor(Math.random()*this[suit].length);
          return this[suit].splice(index,1)[0];
        }
      };

      var nums = ['&#x25b2;', '2', '3', '4', '5', '6', '7', '8', '9', '&#x25cf;', '&#x25cf;', '&#x25cf;', '&#x25cf;'];

      _.each(nums, function(num) {
        this.deck.black.push({ suit: 'black', val: num });
        this.deck.black.push({ suit: 'black', val: num });
        this.deck.red.push({ suit: 'red', val: num });
        this.deck.red.push({ suit: 'red', val: num });
      }.bind(this));

      console.log('created room ' + this.id);
      this.data.lastReportedAge = 0;
    },

    newMember: function(user) {
      if (this.teams.red === '') {
        this.teams.red = user.id;
        user.team = 'red';
        user.message('userMessage', 'your team is red and your id is ' + user.id);
      }
      else if (this.teams.black === '') {
        this.teams.black = user.id;
        user.team = 'black';
        user.message('userMessage', 'your team is black and your id is ' + user.id);
      }
      else {
        var msg = 'Um, we tried to assign a team member but all teams were taken for this room.';
        console.log(msg);
        user.team = 'none';
        user.message('userMessage', msg);
      }
      user.message('assignTeam', {
        team: user.team,
        turn: this.turn
      });
    },

    memberLeaves: function(user) {
      // if we have 0 people in the room, close the room
      if (this.getMembers().length <= 0) {
        cloak.deleteRoom(this);
      }
    },

    pulse: function() {
      // add timed turn stuff here
    },

    close: function() {
      this.messageMembers('you have left ' + this.name);
    }

  }

});

cloak.run();
