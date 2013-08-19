/* global io,console,_ */

window.cloak = (function() {

  var uid;
  var connected = false;
  var socket;
  var config;
  var events = {};

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

    run: function(url) {

      socket = io.connect(url);

      socket.on('connect', function() {
        connected = true;
        cloak.trigger('connect');
        if (uid === undefined) {
          socket.emit('begin', {});
        }
        else {
          socket.emit('resume', {uid: uid});
        }
      });

      socket.on('disconnect', function() {
        connected = false;
        cloak.trigger('disconnect');
        socket.socket.connect();
      });

      socket.on('beginResponse', function(data) {
        uid = data.uid;
        cloak.trigger('begin');
      });

      socket.on('resumeResponse', function(data) {
        if (data.valid) {
          cloak.trigger('resume');
        }
        else {
          cloak.trigger('error', 'Could not resume.');
        }
      });

    },

    disconnect: function() {
      socket.disconnect();
    }

  };

  return cloak;

})();