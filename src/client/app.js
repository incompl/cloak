/* global cloak,_ */

var config;

function output(msg) {
  var msgElem = document.createElement('div');
  msgElem.innerText = msg;
  document.querySelector('#output').appendChild(msgElem);
}

cloak.on('connect', function() {
  output('connect');
});

cloak.on('disconnect', function() {
  output('disconnect');
});

cloak.on('begin', function(configArg) {
  output('begin');
  config = configArg;
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
});

cloak.on('resume', function(configArg) {
  output('resume');
  config = configArg;
});

cloak.on('end', function(msg) {
  output('end');
});

cloak.on('message', function(msg) {
  output(msg);
});

cloak.on('error', function(msg) {
  output(msg);
});

cloak.run('http://localhost:8090');