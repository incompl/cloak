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
  var usernames = {};
  var rooms = {};
  var socketIdToUserId = {};
  var io;
  var gameLoopInterval;
  var lobby;
  var roomNum = 0;

  var defaults = {
    port: 8090,
    logLevel: 1,
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

      // We won't want to try to serialize this later
      if (config.express) {
        delete config.express;
      }

      io.set('log level', config.logLevel);

      lobby = new Room('Lobby', 0, events.lobby, true);

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
          console.log((cloak._host(socket) + ' disconnects').info);
        });

        socket.on('cloak-begin', function(data) {
          var user = new User(socket);
          users[user.id] = user;
          socketIdToUserId[socket.id] = user.id;
          cloak._setupHandlers(socket);
          socket.emit('cloak-beginResponse', {uid:user.id, config:config});
          console.log((cloak._host(socket) + ' begins').info);
          if (config.autoJoinLobby) {
            lobby.addMember(user);
          }
        });

        socket.on('cloak-resume', function(data) {
          var uid = data.uid;
          var user = users[uid];
          if (user !== undefined) {
            socketIdToUserId[socket.id] = uid;
            user._socket = socket;
            delete user.disconnectedSince;
            cloak._setupHandlers(socket);
            socket.emit('cloak-resumeResponse', {
              valid: true,
              config: config
            });
            console.log((cloak._host(socket) + ' resumes').info);
          }
          else {
            socket.emit('cloak-resumeResponse', {valid: false});
            console.log((cloak._host(socket) + ' fails to resume').info);
          }
        });

        socket.on('cloak-listUsers', function(data) {
          var user = cloak._getUserForSocket(socket);
          socket.emit('cloak-listUsersResponse', {
            users: _.map(user.room.members, function(member) {
              return {
                id: member.id,
                username: member.username,
                room: {
                  id: member.room.id,
                  name: member.room.name,
                  size: member.room.size,
                  userCount: member.room.members.length,
                  lobby: (member.room.id === lobby.id)
                }
              };
            })
          });
        });

        socket.on('cloak-joinLobby', function() {
          var user = cloak._getUserForSocket(socket);
          lobby.addMember(user);
          socket.emit('cloak-joinLobbyResponse', {
            success: true
          });
        });

        socket.on('cloak-leaveRoom', function() {
          var user = cloak._getUserForSocket(socket);
          user.leaveRoom();
          socket.emit('cloak-leaveRoomResponse', {
            success: true
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
        var room;

        // Pulse all rooms
        _(rooms).forEach(function(room) {
          var oldEnoughToPrune = room.members.length < 1 && new Date().getTime() - room._lastEmpty >= config.pruneEmptyRooms;
          var roomExpired = config.roomLife !== null && new Date().getTime() - room.created >= config.roomLife;

          if (roomExpired) {
            cloak.deleteRoom(room);
          }
          else if (config.pruneEmptyRooms && oldEnoughToPrune) {
            cloak.deleteRoom(room);
          }
          else {
            room.pulse();
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
              cloak.deleteRoom(room);
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
              cloak.deleteUser(user);
            }
          });
        }

      }, config.gameLoopSpeed);

      console.log(('cloak running on port ' + config.port).info);

    },

    _setupHandlers: function(socket) {

      socket.on('cloak-listRooms', function(data) {
        socket.emit('cloak-listRoomsResponse', {
          rooms: cloak._listRoomsForClient()
        });
      });

      socket.on('cloak-joinRoom', function(data) {
        var uid = cloak._getUidForSocket(socket);
        var user = users[uid];
        var room = rooms[data.id];
        var success = false;
        var roomAvailable = !room._closing && (room.size === null || room.members.length < room.size);
        if (room && roomAvailable) {
          success = room.addMember(user);
        }
        socket.emit('cloak-joinRoomResponse', {
          success: success
        });
      });

      socket.on('cloak-getRoomMembers', function(data) {
        var room = rooms[data.id];
        var response = room ? room.getMembers() : null;
        socket.emit('cloak-getRoomMembersResponse', {
          members: response
        });
      });

      _(config.messages).each(function(handler, name) {
        socket.on('message-' + name, function(arg) {
          var user = cloak._getUserForSocket(socket);
          try {
            handler(arg, user);
          }
          catch (err) {
            console.error(err);
          }
        });
      });

    },

    _listRoomsForClient: function() {
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
      var roomName = name || 'Nameless Room';
      var roomSize = size || config.defaultRoomSize;
      var room = new Room(roomName, roomSize, events.room, false, config.minRoomMembers);
      rooms[room.id] = room;
      if (config.notifyRoomChanges) {
        // Message everyone in lobby
        lobby._serverMessageMembers('roomCreated', cloak._listRoomsForClient());
      }
      return room;
    },

    deleteRoom: function(room) {
      var id = room.id;
      rooms[id]._close();
      delete rooms[id];
      if (config.notifyRoomChanges) {
        lobby._serverMessageMembers('roomDeleted', cloak._listRoomsForClient());
      }
    },

    getRoom: function(id) {
      return rooms[id] || false;
    },

    deleteUser: function(user) {
      user.leaveRoom();
      user._socket.disconnect();
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

    getUsers: function() {
      return _.values(users);
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
        cloak.deleteUser(user);
      });

      // Delete all rooms
      _(rooms).forEach(function(room) {
        cloak.deleteRoom(room);
      });

      // Shut down socket server
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
    },

    createTimer: function(name, millis, descending) {
      return new Timer(name, millis || 0, descending || false);
    }

  };

  return cloak;

})();
