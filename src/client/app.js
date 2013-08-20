/* global cloak,_ */

function output(msg) {
  var msgElem = document.createElement('div');
  msgElem.innerText = msg;
  document.querySelector('#output').appendChild(msgElem);
}

cloak.configure({

  messages: {

    foo: function(arg) {
      output('foo: ' + arg);
    },

    bar: function(arg) {
      output('bar: ' + arg);
      cloak.message('sup', 'hehe');
    },

    yo: function(arg) {
      output('yo: ' + arg);
    }

  },

  serverEvents: {

    'connect': function() {
      output('connect');
    },

    'disconnect': function() {
      output('disconnect');
    },

    'begin': function() {
      output('begin');
      cloak.listRooms(function(rooms) {
        _(rooms).each(function(room) {
          output(room.name + ' (' + room.userCount + '/' + room.size + ')');
        });
        var joining = rooms[0];
        if (joining === undefined) {
          output('no rooms');
          return;
        }
        output('joining ' + joining.name);
        cloak.joinRoom(joining.id, function(success) {
          output(success ? 'joined' : 'failed');
        });
      });
    },

    'resume': function() {
      output('resume');
    },

    'end': function() {
      output('end');
    },

    'error': function(msg) {
      output('server error: ' + msg);
    }

  }

});

cloak.run('http://localhost:8090');