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

    _close: function() {
      this._closing = true;
      if (this._roomEvents.close) {
        this._roomEvents.close.call(this);
      }
      _(this.members).forEach(function(user) {
        user.leaveRoom();
      });
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
      this._serverMessageMembers(this.isLobby ? 'lobbyMemberJoined' : 'roomMemberJoined', _.pick(user, 'id', 'username'));
      user._serverMessage('joinedRoom', _.pick(this, 'name'));
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
      if (!this.isLobby && this._autoJoinLobby) {
        this._lobby.addMember(user);
      }
      this._serverMessageMembers(this.isLobby ? 'lobbyMemberLeft' : 'roomMemberLeft', _.pick(user, 'id', 'username'));
      user._serverMessage('leftRoom', _.pick(this, 'name'));
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
        member._serverMessage(name, arg);
      }.bind(this));
    }

  };

  return Room;

})();
