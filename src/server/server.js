/* jshint node:true */

var cloak = require('./cloak');

cloak.events({

  room: {

    init: function() {
      this.data.lastReportedAge = 0;
    },

    pulse: function() {
      var age = this.age();
      if (this.data.lastReportedAge + 1000 < age) {
        this.messageMembers('room age ' + Math.round(age / 1000));
        this.data.lastReportedAge = age;
      }
    },

    close: function() {
      this.messageMembers('you have left ' + this.name);
    }

  }

});

cloak.createRoom('cool room');
cloak.createRoom('lame room', 3);

cloak.run();
