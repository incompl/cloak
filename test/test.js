/* jshint node:true */

var connect = require('connect');
var path = require('path');
var cloak = require('../src/server/cloak');
var io = require('socket.io-client');

module.exports = {

  setUp: function(callback) {
    console.log('setUp');
    callback();
  },

  tearDown: function(callback) {
    console.log('tearDown');
    callback();
  },

  sendMessage: function(test) {
    var socket;
    cloak.configure({
      port: 8091,
      messages: {
        dog: function() {
          try {
            test.ok(true, 'received message');
            socket.disconnect();
            cloak.stop();
          }
          catch(e) {
            console.log(e);
          }
          test.done();
        }
      }
    });
    cloak.run();
    socket = io.connect('http://localhost:8091');
    socket.on('connect', function() {
      socket.emit('cloak-begin', {});
      socket.emit('message-dog', {});
    });
  },

};