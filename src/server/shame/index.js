/* jshint node:true */

var _ = require('underscore');
var socketIO = require('socket.io');
var uuid = require('node-uuid');

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
    roomLife: 10000
  };

  var config = _.extend({}, defaults);

  // game loop
  window.setInterval(function() {
    _(rooms).forEach(function(room) {
      if (new Date().getTime() - room.created >= config.roomLife) {
        shame.deleteRoom(room.id);
      }
      else {

      }
    });
  }, 100);

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

        socket.on('disconnect', function(data) {
          delete socketIdToUserId[socket.id];
          console.log(shame.host(socket) + ' disconnects');
        });

        socket.on('begin', function(data) {
          var uid = uuid.v4();
          users[uid] = {
            uid: uid,
            config: config
          };
          socketIdToUserId[socket.id] = uid;
          shame.setupHandlers(socket);
          socket.emit('beginResponse', {uid:uid, config:config});
          console.log(shame.host(socket) + ' begins');
        });

        socket.on('resume', function(data) {
          if (users[data.uid] !== undefined) {
            socketIdToUserId[socket.id] = data.uid;
            shame.setupHandlers(socket);
            socket.emit('resumeResponse', {
              valid: true,
              config: config
            });
            console.log(shame.host(socket) + ' resumes');
          }
          else {
            socket.emit('resumeResponse', {valid: false});
            console.log(shame.host(socket) + ' fails to resume');
          }
        });
      });

    },

    setupHandlers: function(socket) {

      if (!config.autoJoinRoom) {

        socket.on('listRooms', function(data) {
          socket.emit('listRoomsResponse', {
            rooms: shame.listRooms()
          });
        });

        socket.on('joinRoom', function(data) {
          var uid = shame.getUidFor(socket);
          var room = rooms[data.id];
          var success = false;
          if (room && room.users.length < room.size) {
            room.users.push(users[uid]);
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
          userCount: room.users.length,
          size: room.size
        };
      });
    },

    createRoom: function(name, size) {
      var room = new Room(name, size);
      rooms[uuid.v4()] = room;
    },

    deleteRoom: function(id) {
      var room = rooms[id];
      _.forEach(room.users, function(user) {
        // todo 
      });
      delete room[id];
    },

    getUidFor: function(socket) {
      return socketIdToUserId[socket.id];
    }

  };

  return shame;

})();