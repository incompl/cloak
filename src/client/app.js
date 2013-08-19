/* global cloak */

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

cloak.on('begin', function() {
  output('begin');
});

cloak.on('resume', function() {
  output('resume');
});

cloak.on('error', function(msg) {
  output('error "' + msg + '"');
});

cloak.run('http://localhost:8090');