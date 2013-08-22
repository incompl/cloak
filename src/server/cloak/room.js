/* jshint node:true */

var _ = require('underscore');
var uuid = require('node-uuid');

module.exports = (function() {

  function Room(nameArg, sizeArg, roomEventsArg, isLobby) {
    this._roomEvents = roomEventsArg || {};
    this.isLobby = isLobby;
    this.id = uuid.v4();
    this.name = nameArg;
    this.members = [];
    this.size = sizeArg;
    this.created = new Date().getTime();
    this.data = {};

    if (this._roomEvents.init) {
      this._roomEvents.init.call(this);
    }
  }

  Room.prototype = {

    close: function() {
      console.log('close happened');
      if (this._roomEvents.close) {
        this._roomEvents.close.call(this);
      }
      this.members = [];
    },

    pulse: function() {
      if (this._roomEvents.pulse) {
        this._roomEvents.pulse.call(this);
      }
    },

    addMember: function(user) {
      user.leaveRoom();
      this.members.push(user);
      user.room = this;
      if (this._roomEvents.newMember) {
        this._roomEvents.newMember.call(this, user);
      }
      this._serverMessageMembers('newRoomMember', _.pick(user, 'id', 'username'));
    },

    removeMember: function(user) {
      if (user.room !== this) {
        return;
      }
      this.members = _(this.members).without(user);
      delete user.room;
      if (this._roomEvents.memberLeaves) {
        this._roomEvents.memberLeaves.call(this, user);
      }
      if (!this.isLobby && Room._autoJoinLobby) {
        Room._lobby.addMember(user);
      }
    },

    age: function() {
      return new Date().getTime() - this.created;
    },

    messageMembers: function(name, arg) {
      _.forEach(this.members, function(member) {
        member.message(name, arg);
      }.bind(this));
    },

    _serverMessageMembers: function(name, arg) {
      _.forEach(this.members, function(member) {
        console.log(member.id);
        member._serverMessage(name, arg);
      }.bind(this));
    }

  };

  return Room;

})();
