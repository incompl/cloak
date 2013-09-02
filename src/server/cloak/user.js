/* jshint node:true */

var _ = require('underscore');
var uuid = require('node-uuid');

module.exports = (function() {

  function User(socketArg) {
    this.id = uuid.v4();
    this._socket = socketArg;
    this.username = '';
  }

  User.prototype = {

    message: function(name, arg) {
      this._socket.emit('message-' + name, arg);
    },

    _serverMessage: function(name, arg) {
      this._socket.emit('cloak-' + name, arg);
    },

    setSocket: function(socketArg) {
      this._socket = socketArg;
    },

    leaveRoom: function() {
      if (this.room !== undefined) {
        this.room.removeMember(this);
      }
    },

    enterRoom: function(room) {
      room.addMember(this);
    },

    connected: function() {
      return this.disconnectedSince === null;
    }

  };

  return User;

})();
