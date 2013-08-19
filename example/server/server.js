/* global require */

var cloak = require('../../src/server/cloak');
var _ = require('underscore');

cloak.events({

  room: {

    init: function() {
      this.deck = [1, 2, 3, 4, 5];
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
