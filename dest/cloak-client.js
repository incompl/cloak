/* cloak client */
/* global cloak:true,module,io:true,console,_:true */

(function() {

  var createCloak = function() {

    var uid;
    var done = true;
    var socket;
    var url;
    var events = {};
    var config = {};
    var serverConfig;
    var callbacks = {};

    function handleResponsesFor(socket, responseName, dataProperty) {
      socket.on(responseName, function(data) {
        if (callbacks[responseName] !== undefined) {
          _(callbacks[responseName]).forEach(function(callback) {
            callback(data[dataProperty]);
          });
        }
        callbacks[responseName] = [];
      });
    }

    var cloak = {

      _setLibs: function(a, b) {
        _ = a;
        io = b;
      },

      configure: function(configArg) {

        _(configArg).forEach(function(val, key) {
          if (key === 'serverEvents') {
            _(val).forEach(function(eventHandler, eventName) {
              cloak._on('cloak-' + eventName, eventHandler);
            });
          }
          else {
            config[key] = val;
          }
        });
      },

      _on: function(event, handler) {
        if (events[event] === undefined) {
          events[event] = [];
        }
        events[event].push(handler);
      },

      _off: function(event, handler) {
        events[event] = _(events[event]).without(handler);
      },

      _trigger: function(event, arg) {
        if (events[event] !== undefined) {
          _.forEach(events[event], function(handler) {
            handler(arg);
          });
        }
      },

      run: function(urlArg) {

        url = urlArg;
        socket = io.connect(url, {
          'force new connection': true
        });

        socket.on('error', function(data) {
          cloak._trigger('cloak-error', data);
        });

        socket.on('connect_error', function(data) {
          cloak._trigger('cloak-error', 'Connect error');
        });

        socket.on('connect_timeout', function(data) {
          cloak._trigger('cloak-error', 'Connect timeout');
        });

        socket.on('connect', function() {
          cloak._trigger('cloak-connect');
          if (uid === undefined) {
            socket.emit('cloak-begin', {});
          }
          else {
            socket.emit('cloak-resume', {uid: uid});
          }
        });

        socket.on('disconnect', function() {
          cloak._trigger('cloak-disconnect');
          if (!done) {
            socket.socket.connect();
          }
        });

        socket.on('connecting', function() {
          cloak._trigger('cloak-connecting');
        });

        socket.on('reconnecting', function() {
          cloak._trigger('cloak-reconnecting');
        });

        socket.on('cloak-roomMemberJoined', function(user) {
          cloak._trigger('cloak-roomMemberJoined', user);
        });

        socket.on('cloak-roomMemberLeft', function(user) {
          cloak._trigger('cloak-roomMemberLeft', user);
        });

        socket.on('cloak-lobbyMemberJoined', function(user) {
          cloak._trigger('cloak-lobbyMemberJoined', user);
        });

        socket.on('cloak-lobbyMemberLeft', function(user) {
          cloak._trigger('cloak-lobbyMemberLeft', user);
        });

        socket.on('cloak-joinedRoom', function(room) {
          cloak._trigger('cloak-joinedRoom', room);
        });

        socket.on('cloak-leftRoom', function(room) {
          cloak._trigger('cloak-leftRoom', room);
        });

        socket.on('cloak-beginResponse', function(data) {
          uid = data.uid;
          serverConfig = data.config;
          done = false;
          cloak._trigger('cloak-begin');
        });

        socket.on('cloak-resumeResponse', function(data) {
          if (data.valid) {
            serverConfig = data.config;
            cloak._trigger('cloak-resume');
          }
          else {
            cloak._trigger('cloak-error', 'Could not resume.');
            cloak.end();
          }
        });

        handleResponsesFor(socket, 'cloak-listRoomsResponse', 'rooms');
        handleResponsesFor(socket, 'cloak-joinRoomResponse', 'success');
        handleResponsesFor(socket, 'cloak-createRoomResponse', 'room');
        handleResponsesFor(socket, 'cloak-listUsersResponse', 'users');
        handleResponsesFor(socket, 'cloak-registerUsernameResponse', 'success');

        _(config.messages).forEach(function(handler, name) {
          socket.on('message-' + name, function(data) {
            cloak._trigger('message-' + name, data);
          });
          cloak._on('message-' + name, handler);
        });

      },

      end: function() {
        done = true;
        this._disconnect();
        cloak._trigger('cloak-end');
      },

      _disconnect: function() {
        socket.disconnect();
      },

      connected: function() {
        return socket.socket.connected;
      },

      _callback: function(name, callback) {
        if (callbacks[name] === undefined) {
          callbacks[name] = [];
        }
        callbacks[name].push(callback);
      },

      createRoom: function(data, callback) {
        this._callback('cloak-createRoomResponse', callback);
        socket.emit('cloak-createRoom', data);
      },

      listRooms: function(callback) {
        this._callback('cloak-listRoomsResponse', callback);
        socket.emit('cloak-listRooms', {});
      },

      joinLobby: function(callback) {
        this._callback('cloak-joinLobbyResponse', callback);
        socket.emit('cloak-joinLobby', {});
      },

      joinRoom: function(id, callback) {
        this._callback('cloak-joinRoomResponse', callback);
        socket.emit('cloak-joinRoom', {id: id});
      },

      leaveRoom: function(callback) {
        this._callback('cloak-leaveRoomResponse', callback);
        socket.emit('cloak-leaveRoom');
      },

      listUsers: function(callback) {
        this._callback('cloak-listUsersResponse', callback);
        socket.emit('cloak-listUsers', {});
      },

      registerUsername: function(username, callback) {
        this._callback('cloak-registerUsernameResponse', callback);
        socket.emit('cloak-registerUsername', {username: username});
      },

      message: function(name, arg) {
        socket.emit('message-' + name, arg);
      }

    };

    return cloak;

  };

  if (typeof window === 'undefined') {
    module.exports = createCloak;
  }
  else {
    cloak = createCloak();
  }

}());
