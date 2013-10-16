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
    this._emitEvent('init', this);
  }

  Room.prototype = {

    _close: function() {
      this._closing = true;
      _(this.members).forEach(function(user) {
        user.leaveRoom();
      });
      this._emitEvent('close', this);
    },

    pulse: function() {
      this._emitEvent('pulse', this);
    },

    // return true if successful
    addMember: function(user) {
      if (!this._shouldAllowUser(user)) {
        return false;
      }
      user.leaveRoom();
      this.members.push(user);
      user.room = this;
      this._emitEvent('newMember', this, user);
      this._serverMessageMembers(this.isLobby ? 'lobbyMemberJoined' : 'roomMemberJoined', _.pick(user, 'id', 'username'));
      user._serverMessage('joinedRoom', _.pick(this, 'name'));
      return true;
    },

    removeMember: function(user) {
      if (user.room !== this) {
        return;
      }
      this.members = _(this.members).without(user);
      delete user.room;
      if (!this.isLobby && this._autoJoinLobby) {
        this._lobby.addMember(user);
      }
      this._emitEvent('memberLeaves', this, user);
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
    },

    _shouldAllowUser: function(user) {
      if (this._roomEvents.shouldAllowUser) {
        return this._emitEvent('shouldAllowUser', this, user);
      }
      else {
        return true;
      }
    },

    _emitEvent: function(event, context, arguments) {
      var roomEvent = this._roomEvents[event];
      if (arguments !== undefined && !Array.isArray(arguments)) {
        arguments = [arguments];
      }
      if (!!roomEvent) {
        return roomEvent.apply(context, arguments);
      }
    }

  };

  return Room;

})();
