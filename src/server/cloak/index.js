/* cloak server */
/* jshint node:true */

var _ = require('underscore');
var socketIO = require('socket.io');
var uuid = require('node-uuid');
var colors = require('colors');

var User = require('./user.js');
var Room = require('./room.js');
var Timer = require('./timer.js');

module.exports = (function() {

  var users = {};
  var rooms = {};
  var socketIdToUserId = {};
  var io;
  var gameLoopInterval;
  var lobby;
  var roomNum = 0;

  var defaults = {
    port: 8090,
    gameLoopSpeed: 100,
    defaultRoomSize: null,
    autoCreateRooms: false,
    minRoomMembers: null,
    reconnectWait: 10000,
    pruneEmptyRooms: null,
    roomLife: null,
    autoJoinLobby: true,
    notifyRoomChanges: true
  };

  var config;
  var events;

  colors.setTheme({
    info: 'cyan',
    warn: 'yellow',
    error: 'red'
  });

  var cloak = {

    // shorthand to get host string for socket
    _host: function(socket) {
      return socket.handshake.address.address;
    },

    // configure the server
    configure: function(configArg) {

      config = _.extend({}, defaults);
      events = {};

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

      if (this.port !== undefined && typeof this.port !== 'number') {
        throw 'Port must be a number. Trying to use express? ' +
              'Pass the server into express instead of port.';
      }

      io = socketIO.listen(config.express || config.port);

      if (config.express) {
        console.log(('cloak running with express on port ' +
                    config.express.address().port).info);
      }
      else {
        console.log(('cloak running on port ' + config.port).info);
      }

      // We won't want to try to serialize this later
      if (config.express) {
        delete config.express;
      }

      // Cloak defaults Socket.IO log level to 1
      io.set('log level', 1);

      // Apply user Socket.IO settings
      var ioConfig = config.socketIo;
      if (typeof ioConfig === 'object') {
        for (var key in ioConfig) {
          io.set(key, ioConfig[key]);
        }
      }

      lobby = new Room(cloak, 'Lobby', 0, events.lobby, true);

      Room.prototype._lobby = lobby;
      Room.prototype._autoJoinLobby = config.autoJoinLobby;
      Room.prototype._minRoomMembers = config.minRoomMembers;

      io.sockets.on('connection', function(socket) {
        console.log((cloak._host(socket) + ' connects').info);

        socket.on('disconnect', function(data) {
          var uid = socketIdToUserId[socket.id];
          var user = cloak._getUser(uid);
          if (!user) {
            return;
          }
          user.disconnectedSince = new Date().getTime();
          delete socketIdToUserId[socket.id];
          if (config.clientEvents && config.clientEvents.disconnect) {
            config.clientEvents.disconnect(user);
          }
          console.log((cloak._host(socket) + ' disconnects').info);
        });

        socket.on('cloak-begin', function(data) {
          var user = new User(cloak, socket, data);
          users[user.id] = user;
          socketIdToUserId[socket.id] = user.id;
          cloak._setupHandlers(socket);
          socket.emit('cloak-beginResponse', {uid:user.id, config:config});
          console.log((cloak._host(socket) + ' begins').info);
          if (config.autoJoinLobby) {
            lobby.addMember(user);
          }
          if (config.clientEvents && config.clientEvents.begin) {
            config.clientEvents.begin(user);
          }
        });

        socket.on('cloak-resume', function(data) {
          var uid = data.uid;
          var user = users[uid];
          if (user !== undefined) {
            socketIdToUserId[socket.id] = uid;
            user._socket = socket;
            user.disconnectedSince = null;
            cloak._setupHandlers(socket);
            socket.emit('cloak-resumeResponse', {
              valid: true,
              config: config
            });
            if (config.clientEvents && config.clientEvents.resume) {
              config.clientEvents.resume(user);
            }
            console.log((cloak._host(socket) + ' resumes').info);
          }
          else {
            socket.emit('cloak-resumeResponse', {valid: false});
            console.log((cloak._host(socket) + ' fails to resume').info);
          }
        });

      });

      gameLoopInterval = setInterval(function() {
        var room;

        // Pulse lobby
        lobby._pulse();

        // Pulse all rooms
        _(rooms).forEach(function(room) {
          var oldEnoughToPrune = room.members.length < 1 && new Date().getTime() - room._lastEmpty >= config.pruneEmptyRooms;
          var roomExpired = config.roomLife !== null && new Date().getTime() - room.created >= config.roomLife;

          if (roomExpired) {
            room.delete();
          }
          else if (config.pruneEmptyRooms && oldEnoughToPrune) {
            room.delete();
          }
          else {
            room._pulse();
          }
        });

        var membersAvailable = config.minRoomMembers !== null && lobby.members.length >= config.minRoomMembers;

        // autoCreateRooms
        if (config.autoCreateRooms && membersAvailable) {
          roomNum++;
          room = cloak.createRoom('Room ' + roomNum);
          _.range(config.minRoomMembers).forEach(function(i) {
            room.addMember(lobby.members[0]);
          });
        }

        // Prune rooms with member counts below minRoomMembers
        if (config.minRoomMembers !== null) {
          _(rooms).forEach(function(room) {
            if (room._hasReachedMin && room.members.length < config.minRoomMembers) {
              room.delete();
            }
          });
        }

        // reconnectWait and reconnectWaitRoomless
        // aka prune users that have been disconnected too long
        if (config.reconnectWait !== null || config.reconnectWaitRoomless !== null) {
          _(users).forEach(function(user) {

            if (user.connected()) {
              return;
            }

            var wait = null;
            if (user.room === undefined && config.reconnectWaitRoomless) {
                wait = config.reconnectWaitRoomless;
            }
            else {
              wait = config.reconnectWait;
            }

            var userExpired = new Date().getTime() - user.disconnectedSince >= wait;

            if (wait !== null && userExpired) {
              user.delete();
            }
          });
        }

      }, config.gameLoopSpeed);

    },

    _setupHandlers: function(socket) {

      _(config.messages).each(function(handler, name) {
        socket.on('message-' + name, function(arg) {
          var user = cloak._getUserForSocket(socket);
          try {
            handler(arg, user);
          }
          catch (error) {
            console.error('Uncaught error in message handler for "' + name + '"');
            console.error(error);
          }
        });
      });

    },

    getRooms: function(json) {
      if (json) {
        return _.invoke(rooms, '_roomData');
      }
      else {
        return _.values(rooms);
      }
    },

    createRoom: function(name, size) {
      var roomName = name || 'Nameless Room';
      var roomSize = size || config.defaultRoomSize;
      var room = new Room(cloak, roomName, roomSize, events.room, false, config.minRoomMembers);
      rooms[room.id] = room;
      if (config.notifyRoomChanges) {
        // Message everyone in lobby
        lobby._serverMessageMembers('roomCreated', cloak.roomCount());
      }
      return room;
    },

    _deleteRoom: function(room) {
      delete rooms[room.id];
      if (config.notifyRoomChanges) {
        lobby._serverMessageMembers('roomDeleted', cloak.roomCount());
      }
    },

    getRoom: function(id) {
      return rooms[id] || false;
    },

    getLobby: function() {
      return lobby;
    },

    _deleteUser: function(user) {
      delete users[user.id];
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

    userCount: function() {
      return _(users).size();
    },

    roomCount: function() {
      return _(rooms).size();
    },

    getUser: function(id) {
      return users[id] || false;
    },

    getUsers: function(json) {
      if (json) {
        return _.invoke(users, '_userData');
      }
      else {
        return _.values(users);
      }
    },

    messageAll: function(name, arg) {
      _(users).forEach(function(user) {
        user.message(name, arg);
      });
    },

    stop: function(callback) {

      // Stop the game loop
      clearInterval(gameLoopInterval);

      // Delete all users
      _(users).forEach(function(user) {
        user.delete();
      });

      // Delete all rooms
      _(rooms).forEach(function(room) {
        room.delete();
      });

      // Shut down socket server
      if (io) {
        try {
          io.server.close();
          callback();
        }
        catch(e) {
          callback();
        }
      }
      else {
        callback();
      }
    },

    createTimer: function(name, millis, descending) {
      return new Timer(name, millis || 0, descending || false);
    },

    // For testing
    _getIo: function() {
      return io;
    }

  };

  return cloak;

})();
