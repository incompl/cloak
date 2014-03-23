/* cloak client */
/* global cloak:true,module,io:true,console,_:true */

(function() {

  var createCloak = function() {

    var uid;
    var socket;
    var events = {};
    var config = {};
    var timerEvents = {};
    var serverConfig;

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
          else if (key === 'timerEvents') {
            timerEvents = val;
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

      run: function(url) {

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
          if (uid === undefined) {
            socket.emit('cloak-begin', {});
          }
          else {
            socket.emit('cloak-resume', {uid: uid});
          }
        });

        socket.on('disconnect', function() {
          cloak._trigger('cloak-disconnect');
        });

        socket.on('connecting', function() {
          cloak._trigger('cloak-connecting');
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

        socket.on('cloak-roomCreated', function(rooms) {
          cloak._trigger('cloak-roomCreated', rooms);
        });

        socket.on('cloak-roomDeleted', function(rooms) {
          cloak._trigger('cloak-roomDeleted', rooms);
        });

        socket.on('cloak-beginResponse', function(data) {
          uid = data.uid;
          serverConfig = data.config;
          cloak._trigger('cloak-begin');
        });

        socket.on('cloak-resumeResponse', function(data) {
          if (data.valid) {
            serverConfig = data.config;
            cloak._trigger('cloak-resume');
          }
          else {
            cloak._trigger('cloak-error', 'Could not resume.');
            cloak.stop();
          }
        });

        socket.on('cloak-syncTimer', function(data) {
          var handler = timerEvents[data.name];
          if (handler !== undefined) {
            var val = data.value;

            // compensate for network latency
            if (data.running && data.descending) {
              val -= new Date().getTime() - data.sent;
            }
            else if (data.running) {
              val += new Date().getTime() - data.sent;
            }

            handler(val);
          }
        });

        _(config.messages).forEach(function(handler, name) {
          socket.on('message-' + name, function(data) {
            cloak._trigger('message-' + name, data);
          });
          cloak._on('message-' + name, handler);
        });

      },

      stop: function() {
        this._disconnect();
        cloak._trigger('cloak-end');
      },

      _disconnect: function() {
        socket.disconnect();
      },

      _connect: function() {
        socket.socket.connect();
      },

      connected: function() {
        return socket.socket.connected;
      },

      currentUser: function() {
        return uid;
      },

      message: function(name, arg) {
        if (this.connected()) {
          socket.emit('message-' + name, arg);
        }
        else {
          throw 'Not connected.';
        }
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
