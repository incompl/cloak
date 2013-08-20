/* jshint node:true */

var _ = require('underscore');
var uuid = require('node-uuid');

module.exports = (function() {

  var socket;

  function User(socketArg) {
    this.id = uuid.v4();
    socket = socketArg;
  }

  User.prototype = {

    message: function(name, arg) {
      socket.emit('message-' + name, arg);
    },

    setSocket: function(socketArg) {
      socket = socketArg;
    }

  };

  return User;

})();