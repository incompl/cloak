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

    message: function(arg) {
      socket.emit('message', arg);
    },

    setSocket: function(socketArg) {
      socket = socketArg;
    }

  };

  return User;

})();