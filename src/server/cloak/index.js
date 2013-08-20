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
  var events = {};

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
      _(configArg).forEach(function(val, key) {
        if (key === 'room') {
          events[key] = val;
        }
        else {
          config[key] = val;
        }
      });
    },

    // run the server
    run: function() {
      var io = socketIO.listen(config.port);

      io.set('log level', 1);

      io.sockets.on('connection', function(socket) {
        console.log(cloak.host(socket) + ' connects');

        socket.on('disconnect', function(data) {
          var uid = socketIdToUserId[socket.id];
          var user = cloak.getUser(uid);
          user.leaveRoom();
          delete socketIdToUserId[socket.id];
          delete users[uid];
          console.log(cloak.host(socket) + ' disconnects');
        });

        socket.on('cloak-begin', function(data) {
          var user = new User(socket);
          users[user.id] = user;
          socketIdToUserId[socket.id] = user.id;
          cloak.setupHandlers(socket);
          socket.emit('cloak-beginResponse', {uid:user.id, config:config});
          console.log(cloak.host(socket) + ' begins');
        });

        socket.on('cloak-resume', function(data) {
          var uid = data.uid;
          var user = users[uid];
          if (user !== undefined) {
            socketIdToUserId[socket.id] = uid;
            user.setSocket(socket);
            cloak.setupHandlers(socket);
            socket.emit('cloak-resumeResponse', {
              valid: true,
              config: config
            });
            console.log(cloak.host(socket) + ' resumes');
          }
          else {
            socket.emit('cloak-resumeResponse', {valid: false});
            console.log(cloak.host(socket) + ' fails to resume');
          }
        });
      });

    },

    setupHandlers: function(socket) {

      if (!config.autoJoinRoom) {

        socket.on('cloak-listRooms', function(data) {
          socket.emit('cloak-listRoomsResponse', {
            rooms: cloak.listRooms()
          });
        });

        socket.on('cloak-joinRoom', function(data) {
          var uid = cloak.getUidForSocket(socket);
          var room = rooms[data.id];
          var success = false;
          if (room && room.members.length < room.size) {
            room.addMember(users[uid]);
            success = true;
          }
          socket.emit('cloak-joinRoomResponse', {
            success: success
          });
        });

        _(config.messages).each(function(handler, name) {
          socket.on('message-' + name, function(arg) {
            var user = cloak.getUserForSocket(socket);
            handler(arg, user);
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
      var room = new Room(name, size || config.defaultRoomSize, events.room);
      rooms[room.id] = room;
      return room;
    },

    deleteRoom: function(id) {
      var room = rooms[id];
      room.close();
      delete rooms[id];
    },

    getUidForSocket: function(socket) {
      return socketIdToUserId[socket.id];
    },

    getUserForSocket: function(socket) {
      return this.getUser(this.getUidForSocket(socket));
    },

    getUser: function(uid) {
      return users[uid];
    },

    messageAll: function(name, arg) {
      _(users).forEach(function(user) {
        user.message(name, arg);
      });
    }

  };

  return cloak;

})();