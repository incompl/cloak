/* global require */

var cloak = require('../../src/server/cloak');
var _ = require('underscore');

cloak.events({

  room: {

    init: function() {
      this.deck = [1, 2, 3, 4, 5];
      // generate deck (move to server)
      this.deck = {
        red: [],
        black: []
      }
      var nums = ['A', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'O', 'O', 'O', 'O'];
      _.each(nums, function(num) {
        this.deck.black.push({ suit: 'black', val: num });
        this.deck.black.push({ suit: 'black', val: num });
        this.deck.red.push({ suit: 'red', val: num });
        this.deck.red.push({ suit: 'red', val: num });
      });

    },

    pulse: function() {
    },

    close: function() {
      this.messageMembers('you have left ' + this.name);
    }

  }

});

cloak.createRoom('room', 2);

cloak.run();
