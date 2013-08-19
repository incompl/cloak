/* global io,console,_ */

window.cloak = (function() {

  var uid;
  var done = true;
  var socket;
  var url;
  var events = {};
  var config;
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

    on: function(event, handler) {
      if (events[event] === undefined) {
        events[event] = [];
      }
      events[event].push(handler);
    },

    off: function(event, handler) {
      events[event] = _(events[event]).without(handler);
    },

    trigger: function(event, arg) {
      if (events[event] !== undefined) {
        _.forEach(events[event], function(handler) {
          handler(arg);
        });
      }
    },

    run: function(urlArg) {

      url = urlArg;
      socket = io.connect(url);

      socket.on('connect', function() {
        cloak.trigger('connect');
        if (uid === undefined) {
          socket.emit('begin', {});
        }
        else {
          socket.emit('resume', {uid: uid});
        }
      });

      socket.on('disconnect', function() {
        cloak.trigger('disconnect');
        if (!done) {
          socket.socket.connect();
        }
      });

      socket.on('beginResponse', function(data) {
        uid = data.uid;
        config = data.config;
        done = false;
        cloak.trigger('begin', config);
      });

      socket.on('resumeResponse', function(data) {
        if (data.valid) {
          config = data.config;
          cloak.trigger('resume', config);
        }
        else {
          cloak.trigger('error', 'Could not resume.');
          cloak.end();
        }
      });

      socket.on('message', function(data) {
        cloak.trigger('message', data);
      });

      handleResponsesFor(socket, 'listRoomsResponse', 'rooms');
      handleResponsesFor(socket, 'joinRoomResponse', 'success');

    },

    end: function() {
      done = true;
      this.disconnect();
      cloak.trigger('end');
    },

    disconnect: function() {
      socket.disconnect();
    },

    connected: function() {
      return socket.socket.connected;
    },

    callback: function(name, callback) {
      if (callbacks[name] === undefined) {
        callbacks[name] = [];
      }
      callbacks[name].push(callback);
    },

    listRooms: function(callback) {
      this.callback('listRoomsResponse', callback);
      socket.emit('listRooms', {});
    },

    joinRoom: function(id, callback) {
      this.callback('joinRoomResponse', callback);
      socket.emit('joinRoom', {id: id});
    }

  };

  return cloak;

})();