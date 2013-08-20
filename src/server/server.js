/* jshint node:true */

var cloak = require('./cloak');

cloak.configure({

  roomLife: 5000,

  messages: {

    sup: function(arg, user) {
      setTimeout(function() {
        user.message('yo', 'hehe');
      }, 3000);
    }

  },

  room: {

    init: function() {
      console.log('created room ' + this.id);
      this.data.lastReportedAge = 0;
    },

    pulse: function() {
      var age = this.age();
      if (this.data.lastReportedAge + 1000 < age) {
        this.messageMembers('foo', 'room age ' + Math.round(age / 1000));
        this.data.lastReportedAge = age;
      }
    },

    newMember: function(user) {
      console.log('total members: ' + this.members.length);
    },

    close: function() {
      var newRoomNum = this.data.roomNum + 1;
      var room = cloak.createRoom('room ' + newRoomNum);
      room.data.roomNum = newRoomNum;
      this.messageMembers('foo', 'you have left ' + this.name);
      console.log('closed room ' + this.id);
    }

  }

});

setInterval(function() {
  cloak.messageAll('bar', '5 seconds have passed');
}, 5000);

var initialRoomNum = 1;
var room = cloak.createRoom('room ' + initialRoomNum);
room.data.roomNum = initialRoomNum;

cloak.run();
