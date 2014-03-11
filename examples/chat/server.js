/* jshint node:true */

var cloak = require('cloak');
var _ = require('underscore');
var connect = require('connect');

var clientPort = 8080;
var serverPort = 8090;

var sendLobbyCount = function(arg) {
  this.messageMembers('userCount', this.getMembers().length);
};

cloak.configure({
  port: serverPort,
  messages: {
    chat: function(msg, user) {
      user.getRoom().messageMembers('chat', msg);
    }
  },
  lobby: {
    newMember: sendLobbyCount,
    memberLeaves: sendLobbyCount
  }
});

cloak.run();

connect()
.use(connect.static('./client'))
.listen(clientPort);

console.log('client running on on ' + clientPort);
