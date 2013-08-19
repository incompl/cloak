/* jshint node:true */

var _ = require('underscore');
var uuid = require('node-uuid');

module.exports = (function() {

  function Room(nameArg, sizeArg) {
    this.id = uuid.v4();
    this.name = nameArg;
    this.members = [];
    this.size = sizeArg;
    this.created = new Date().getTime();
  }

  Room.prototype = {

    delete: function() {
      this.messageMembers('Leaving room ' + this.name);
    },

    pulse: function() {
      this.messageMembers('room age ' + this.age());
    },

    age: function() {
      return new Date().getTime() - this.created;
    },

    messageMembers: function(msg) {
      _.forEach(this.members, function(member) {
        member.message(msg);
      }.bind(this));
    }

  };

  return Room;

})();