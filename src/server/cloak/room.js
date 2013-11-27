/* jshint node:true */

var _ = require('underscore');
var uuid = require('node-uuid');

module.exports = (function() {

  function Room(cloak, nameArg, sizeArg, roomEventsArg, isLobby, minRoomMembers) {
    this.cloak = cloak;
    this._roomEvents = roomEventsArg || {};
    this.isLobby = isLobby;
    this.minRoomMembers = minRoomMembers;
    this.id = uuid.v4();
    this.name = nameArg;
    this.members = [];
    this.size = sizeArg;
    this.created = new Date().getTime();
    this.data = {};
    this._emitEvent('init', this);
    this._lastEmpty = new Date().getTime();
  }

  Room.prototype = {

    _pulse: function() {
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
      if (this.minRoomMembers !== null &&
          this.members.length >= this.minRoomMembers) {
        this._hasReachedMin = true;
      }
      this._emitEvent('newMember', this, user);
      this._serverMessageMembers(this.isLobby ? 'lobbyMemberJoined' : 'roomMemberJoined', _.pick(user, 'id', 'name'));
      user._serverMessage('joinedRoom', _.pick(this, 'name'));
      return true;
    },

    removeMember: function(user) {
      if (user.room !== this) {
        return;
      }
      this.members = _(this.members).without(user);
      delete user.room;
      if (this.members.length < 1) {
        this._lastEmpty = new Date().getTime();
      }
      if (!this.isLobby && this._autoJoinLobby) {
        this._lobby.addMember(user);
      }
      this._emitEvent('memberLeaves', this, user);
      this._serverMessageMembers(this.isLobby ? 'lobbyMemberLeft' : 'roomMemberLeft', _.pick(user, 'id', 'name'));
      user._serverMessage('leftRoom', _.pick(this, 'name'));
    },

    age: function() {
      return new Date().getTime() - this.created;
    },

    getMembers: function(json) {
      if (json) {
        return _.invoke(this.members, '_userData');
      }
      else {
        return _.values(this.members);
      }
    },

    messageMembers: function(name, arg) {
      _.forEach(this.members, function(member) {
        member.message(name, arg);
      }.bind(this));
    },

    delete: function() {
      this._closing = true;
      _(this.members).forEach(function(user) {
        user.leaveRoom();
      });
      this._emitEvent('close', this);
      this.cloak._deleteRoom(this);
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

    _emitEvent: function(event, context, args) {
      var roomEvent = this._roomEvents[event];
      if (args !== undefined && !Array.isArray(args)) {
        args = [args];
      }
      if (!!roomEvent) {
        return roomEvent.apply(context, args);
      }
    },

    _roomData: function() {
      return {
        id: this.id,
        name: this.name,
        users: _.map(this.members, function(user) {
          return user._userData();
        }),
        size: this.size
      };
    }

  };

  return Room;

})();
