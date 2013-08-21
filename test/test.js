/* jshint node:true */

var connect = require('connect');
var path = require('path');
var _ = require('underscore');
var io = require('socket.io-client');

var clients;

function createServer() {
  delete require.cache['../src/server/cloak'];
  return require('../src/server/cloak');
}

function createClient() {
  delete require.cache['../src/client/cloak'];
  var client = require('../src/client/cloak');
  clients.push(client);
  return client;
}

module.exports = {

  setUp: function(callback) {
    this.port = 8091;
    this.host = 'http://localhost:' + this.port;
    console.log('creating server');
    this.server = createServer();
    clients = [];
    callback();
  },

  tearDown: function(callback) {
    _(clients).forEach(function(client) {
      console.log('ending client');
      client.end();
    });
    clients = null;
    console.log('stopping server');
    this.server.stop(function() {
      console.log('server stopped');
      callback();
    });
  },

  messageBasics: function(test) {

    var server = this.server;
    var client = createClient();

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