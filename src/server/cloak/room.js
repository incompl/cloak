/* jshint node:true */

var _ = require('underscore');
var uuid = require('node-uuid');

module.exports = (function() {

  var roomEvents;

  function Room(nameArg, sizeArg, roomEventsArg) {
    this.id = uuid.v4();
    this.name = nameArg;
    this.members = [];
    this.size = sizeArg;
    this.created = new Date().getTime();
    this.data = {};
    roomEvents = roomEventsArg;

    if (roomEvents.init) {
      roomEvents.init.call(this);
    }
  }

  Room.prototype = {

    close: function() {
      if (roomEvents.close) {
        roomEvents.close.call(this);
      }
      this.members = [];
    },

    pulse: function() {
      if (roomEvents.pulse) {
        roomEvents.pulse.call(this);
      }
    },

    addMember: function(user) {
      this.members.push(user);
      user.room = this;
      if (roomEvents.newMember) {
        roomEvents.newMember.call(this, user);
      }
    },

    age: function() {
      return new Date().getTime() - this.created;
    },

    messageMembers: function(name, arg) {
      _.forEach(this.members, function(member) {
        member.message(name, arg);
      }.bind(this));
    }

  };

  return Room;

})();