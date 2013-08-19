/* jshint node:true */

var _ = require('underscore');
var socketIO = require('socket.io');
var uuid = require('node-uuid');

var User = require('./user.js');
var Room = require('./room.js');

module.exports = (function() {

  var users = {};
  var rooms = {};
  var socketIdToUserId = {};

  var defaults = {
    port: 8090,
    defaultRoomSize: 5,
    autoJoinRoom: false,
    autoCreateRooms: false,
    reconnectWait: 20000,
    roomLife: 15000
  };

  var config = _.extend({}, defaults);

  // game loop
  setInterval(function() {
    _(rooms).forEach(function(room) {
      if (new Date().getTime() - room.created >= config.roomLife) {
        console.log('end of life for room ' + room.id);
        cloak.deleteRoom(room.id);
      }
      else {
        room.pulse();
      }
    });
  }, 100);

  var cloak = {

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
        console.log(cloak.host(socket) + ' connects');

        socket.on('disconnect', function(data) {
          delete socketIdToUserId[socket.id];
          console.log(cloak.host(socket) + ' disconnects');
        });

        socket.on('begin', function(data) {
          var user = new User(socket);
          users[user.id] = user;
          socketIdToUserId[socket.id] = user.id;
          cloak.setupHandlers(socket);
          socket.emit('beginResponse', {uid:user.id, config:config});
          console.log(cloak.host(socket) + ' begins');
        });

        socket.on('resume', function(data) {
          var uid = data.uid;
          var user = users[uid];
          if (user !== undefined) {
            socketIdToUserId[socket.id] = uid;
            user.setSocket(socket);
            cloak.setupHandlers(socket);
            socket.emit('resumeResponse', {
              valid: true,
              config: config
            });
            console.log(cloak.host(socket) + ' resumes');
          }
          else {
            socket.emit('resumeResponse', {valid: false});
            console.log(cloak.host(socket) + ' fails to resume');
          }
        });
      });

    },

    setupHandlers: function(socket) {

      if (!config.autoJoinRoom) {

        socket.on('listRooms', function(data) {
          socket.emit('listRoomsResponse', {
            rooms: cloak.listRooms()
          });
        });

        socket.on('joinRoom', function(data) {
          var uid = cloak.getUidFor(socket);
          var room = rooms[data.id];
          var success = false;
          if (room && room.members.length < room.size) {
            room.members.push(users[uid]);
            success = true;
          }
          socket.emit('joinRoomResponse', {
            success: success
          });
        });

      }

    },

    listRooms: function() {
      return _(rooms).map(function(room, id) {
        return {
          id: id,
          name: room.name,
          userCount: room.members.length,
          size: room.size
        };
      });
    },

    createRoom: function(name, size) {
      var room = new Room(name, size || config.defaultRoomSize);
      rooms[room.id] = room;
    },

    deleteRoom: function(id) {
      var room = rooms[id];
      room.delete();
      delete rooms[id];
    },

    getUidFor: function(socket) {
      return socketIdToUserId[socket.id];
    }

  };

  return cloak;

})();