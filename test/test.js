/* jshint node:true */

var connect = require('connect');
var path = require('path');
var _ = require('underscore');
var io = require('socket.io-client');

module.exports = {

  setUp: function(callback) {
    this.port = 8091;
    this.host = 'http://localhost:' + this.port;
    this.client = require('../src/client/cloak');
    this.server = require('../src/server/cloak');
    callback();
  },

  tearDown: function(callback) {
    this.client.end();
    this.server.stop();
    callback();
  },

  messageBasics: function(test) {

    var client = this.client;
    var server = this.server;

    server.configure({
      port: this.port,
      messages: {
        dog: function(arg, user) {
          test.ok(true, 'received message from client');
          test.equals(arg.foo, 123);
          user.message('cat', {bar: 456});
        }
      }
    });

    client.configure({
      underscore: _,
      io: io,
      serverEvents: {
        begin: function() {
          client.message('dog', {foo: 123});
        }
      },
      messages: {
        cat: function(arg) {
          test.ok(true, 'received message from server');
          test.equals(arg.bar, 456);
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

  }

};