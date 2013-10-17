/* jshint node:true */

var cloak = require('cloak');
var _ = require('underscore');
var connect = require('connect');

var clientPort = 8080;
var serverPort = 8090;

cloak.configure({
  port: serverPort,
  messages: {
    chat: function(msg, user) {
      user.room.messageMembers('chat', msg);
    }
  }
});

cloak.run();

connect()
.use(connect.static('./client'))
.listen(clientPort);

console.log('client running on on ' + clientPort);
