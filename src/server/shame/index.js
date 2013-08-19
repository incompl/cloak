/* jshint node:true */

var _ = require('underscore');
var socketIO = require('socket.io');
var uuid = require('node-uuid');

var users = {};

module.exports = (function() {

  var defaults = {
    port: 8090
  };

  var config = _.extend({}, defaults);

  var shame = {

    // shorthand to get host string for socket
    host: function(socket) {
      return socket.handshake.address.address;
    },

    // configure the server
    configure: function(configArg) {
      config = _.extend(config, configArg);
    },

    // run the server
    run: function() {
      var io = socketIO.listen(config.port);

      io.sockets.on('connection', function(socket) {
        console.log(shame.host(socket) + ' connects');

        socket.on('begin', function(data) {
          var uid = uuid.v4();
          users[uid] = {
            uid: uid
          };
          shame.setupHandlers(socket);
          socket.emit('beginResponse', {uid:uid});
          console.log(shame.host(socket) + ' begins');
        });

        socket.on('resume', function(data) {
          if (users[data.uid] !== undefined) {
            shame.setupHandlers(socket);
            socket.emit('resumeResponse', {valid: true});
            console.log(shame.host(socket) + ' resumes');
          }
          else {
            socket.emit('resumeResponse', {valid: false});
            console.log(shame.host(socket) + ' fails to resume');
          }
        });
      });

    },

    setupHandlers: function() {

    }

  };

  return shame;

})();