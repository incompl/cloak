/* jshint node:true */

var _ = require('underscore');
var socketIO = require('socket.io');
var uuid = require('node-uuid');

var User = require('./user.js');
var Room = require('./room.js');

module.exports = (function() {

  var users = {};
  var usernames = {};
  var rooms = {};
  var socketIdToUserId = {};
  var events = {};
  var io;
  var gameLoopInterval;
  var lobby;

  var defaults = {
    port: 8090,
    logLevel: 1,
    gameLoopSpeed: 100,
    defaultRoomSize: 5,
    autoJoinRoom: false,
    autoCreateRooms: false,
    roomLife: 0
  };

  var config = _.extend({}, defaults);

  var cloak = {

    // shorthand to get host string for socket
    _host: function(socket) {
      return socket.handshake.address.address;
    },

    // configure the server
    configure: function(configArg) {
      _(configArg).forEach(function(val, key) {
        if (key === 'room' ||
            key === 'lobby') {
          events[key] = val;
        }
        else {
          config[key] = val;
        }
      });
    },

    // run the server
    run: function() {

      io = socketIO.listen(config.port);

      io.set('log level', config.logLevel);

      var lobby = new Room('Lobby', 0, events.lobby);

      io.sockets.on('connection', function(socket) {
        console.log(cloak._host(socket) + ' connects');

        socket.on('disconnect', function(data) {
          var uid = socketIdToUserId[socket.id];
          var user = cloak._getUser(uid);
          user.leaveRoom();
          delete socketIdToUserId[socket.id];
          delete users[uid];
          console.log(cloak._host(socket) + ' disconnects');
        });

        socket.on('cloak-begin', function(data) {
          var user = new User(socket);
          users[user.id] = user;
          socketIdToUserId[socket.id] = user.id;
          cloak._setupHandlers(socket);
          socket.emit('cloak-beginResponse', {uid:user.id, config:config});
          console.log(cloak._host(socket) + ' begins');
          lobby.addMember(user);
        });

        socket.on('cloak-resume', function(data) {
          var uid = data.uid;
          var user = users[uid];
          if (user !== undefined) {
            socketIdToUserId[socket.id] = uid;
            user.setSocket(socket);
            cloak._setupHandlers(socket);
            socket.emit('cloak-resumeResponse', {
              valid: true,
              config: config
            });
            console.log(cloak._host(socket) + ' resumes');
          }
          else {
            socket.emit('cloak-resumeResponse', {valid: false});
            console.log(cloak._host(socket) + ' fails to resume');
          }
        });

        socket.on('cloak-listUsers', function(data) {
          var user = cloak._getUserForSocket(socket);
          socket.emit('cloak-listUsersResponse', {
            users: _.map(user.room.members, function(member) {
              return {
                id: member.id,
                username: member.username
              };
            })
          });
        });

        socket.on('cloak-registerUsername', function(data) {
          var uid = cloak._getUidForSocket(socket);
          var username = data.username;
          var usernames = _.pluck(users, 'username');
          var success = false;
          if (_.indexOf(usernames, username) === -1) {
            success = true;
            users[uid].username = username;
          }
          socket.emit('cloak-registerUsernameResponse', {
            success: success
          });
        });
      });

      gameLoopInterval = setInterval(function() {
        _(rooms).forEach(function(room) {
          if (config.roomLife !== 0 &&
              new Date().getTime() - room.created >= config.roomLife) {
            cloak.deleteRoom(room.id);
          }
          else {
            room.pulse();
          }
        });
      }, config.gameLoopSpeed);

    },

    _setupHandlers: function(socket) {

      if (!config.autoJoinRoom) {

        socket.on('cloak-listRooms', function(data) {
          socket.emit('cloak-listRoomsResponse', {
            rooms: cloak.listRooms()
          });
        });

        socket.on('cloak-joinRoom', function(data) {
          var uid = cloak._getUidForSocket(socket);
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
            var user = cloak._getUserForSocket(socket);
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
          users: _.map(room.members, function(member) {
            return {
              id: member.id,
              username: member.username
            };
          }),
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

    _getUidForSocket: function(socket) {
      return socketIdToUserId[socket.id];
    },

    _getUserForSocket: function(socket) {
      return this._getUser(this._getUidForSocket(socket));
    },

    _getUser: function(uid) {
      return users[uid];
    },

    messageAll: function(name, arg) {
      _(users).forEach(function(user) {
        user.message(name, arg);
      });
    },

    stop: function(callback) {
      clearInterval(gameLoopInterval);
      if (io) {
        try {
          io.server.close();
          io.server.on('close', function() {
            callback();
          });
        }
        catch(e) {
          callback();
        }
      }
      else {
        callback();
      }
    }

  };

  return cloak;

})();
