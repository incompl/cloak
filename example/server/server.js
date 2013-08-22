/* global require */

var cloak = require('../../src/server/cloak');
var _ = require('underscore');

cloak.configure({
  // 3 hour room life
  roomLife: 1000*60*60*3,

  messages: {
    requestCard: function(arg, user) {
      var card = user.room.deck.draw(user.team);
      user.room.lastCard = card;
      user.message('card', card);
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
      // let the users know what turn it is
      user.room.messageMembers('turn', user.room.turn);
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
      //console.log(cloak.listRooms());
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
      user.message('assignTeam', user.team);
      user.message('turn', this.turn);
      //console.log(this.teams);
    },

    pulse: function() {
      // add timed turn stuff here
    },

    close: function() {
      this.messageMembers('you have left ' + this.name);
    }

  }

});

cloak.createRoom('lobby', 1000);
cloak.createRoom('room-1', 2);
cloak.createRoom('room-2', 2);

cloak.run();
