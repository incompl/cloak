/* jshint node:true */

// Nodeunit tests for Cloak client and server

var connect = require('connect');
var path = require('path');
var _ = require('underscore');
var io = require('socket.io-client');

var cloakServer = require('../src/server/cloak');
var createCloakClient = require('../src/client/cloak');

var clients;

// Used in tests to create a new Cloak client. Using this
// function instead of doing it manually means clients
// will be properly cleaned up after tests are done.
function createClient() {
  var client = createCloakClient();
  client._setLibs(_, io);
  clients.push(client);
  return client;
}

module.exports = {

  // setUp is called before every test
  // Pepare a server and an empty client list
  setUp: function(callback) {
    try {
      this.port = 8091;
      this.host = 'http://localhost:' + this.port;
      console.log('creating server');
      this.server = cloakServer;
      clients = [];
      callback();
    }
    catch(e) {
      console.error(e);
    }
  },

  // tearDown is called after every test
  // Shut down server and all clients
  tearDown: function(callback) {
    try {
      _(clients).forEach(function(client) {
        if (client.connected()) {
          console.log('ending client');
          client.end();
        }
        else {
          console.log('client already disconnected');
        }
      });
      clients = null;
      console.log('stopping server');
      this.server.stop(function() {
        console.log('server stopped');
        callback();
      });
    }
    catch(e) {
      console.error(e);
    }
  },

  // Test basic messaging, to and from client
  messageBasics: function(test) {

    test.expect(2);

    var server = this.server;
    var client = createClient();

    server.configure({
      port: this.port,
      messages: {
        dog: function(arg, user) {
          test.equals(arg.foo, 123);
          user.message('cat', {bar: 456});
        }
      }
    });

    client.configure({
      serverEvents: {
        begin: function() {
          client.message('dog', {foo: 123});
        }
      },
      messages: {
        cat: function(arg) {
          test.equals(arg.bar, 456);
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

  },

  // Test that the server can handle two clients
  // and send messages to the right one
  twoClients: function(test) {

    test.expect(4);

    var server = this.server;
    var client1 = createClient();
    var client2 = createClient();

    var doneCount = 0;

    server.configure({
      port: this.port,
      messages: {
        dog1: function(arg, user) {
          test.ok(true, 'received message from client 1');
          user.message('cat', {bar: 456});
        },
        dog2: function(arg, user) {
          test.ok(true, 'received message from client 2');
          user.message('cat', {bar: 789});
        }
      }
    });

    client1.configure({
      serverEvents: {
        begin: function() {
          client1.message('dog1');
        }
      },
      messages: {
        cat: function(arg) {
          test.equals(arg.bar, 456);
          doneCount++;
          if (doneCount === 2) {
            test.done();
          }
        }
      }
    });

    client2.configure({
      serverEvents: {
        begin: function() {
          client2.message('dog2');
        }
      },
      messages: {
        cat: function(arg) {
          test.equals(arg.bar, 789);
          doneCount++;
          if (doneCount === 2) {
            test.done();
          }
        }
      }
    });

    server.run();
    client1.run(this.host);
    client2.run(this.host);

  },

  // Test the autoCreateRooms server option with
  // minRoomMembers set to 2
  autoCreateRooms: function(test) {

    var server = this.server;
    var client1 = createClient();
    var client2 = createClient();

    var steps = [
      'joined Lobby',
      'joined Lobby',
      'joined Room 1',
      'joined Room 1',
      'leave room',
      'joined Lobby',
      'joined Lobby',
    ];

    test.expect(steps.length);

    function step(actual) {
      var expected = steps.shift();
      test.equals(actual, expected);
      if (steps.length === 0) {
        test.done();
      }
    }

    function joinRoomHandler(room) {
      step('joined '+ room.name);
      if (steps[0] === 'leave room') {
        step('leave room');
        client1.leaveRoom();
      }
    }

    server.configure({
      port: this.port,
      autoCreateRooms: true,
      minRoomMembers: 2
    });

    client1.configure({
      serverEvents: {
        joinedRoom: joinRoomHandler
      }
    });

    client2.configure({
      serverEvents: {
        joinedRoom: joinRoomHandler
      }
    });

    server.run();
    client1.run(this.host);
    client2.run(this.host);

  },

  // Test the ability of a client to automatically
  // reconnect and resume after disconnection
  resume: function(test) {

    test.expect(1);

    var server = this.server;
    var client = createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      serverEvents: {
        begin: function() {
          client._disconnect();
        },
        resume: function() {
          test.ok(true, 'resume happened');
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

  },

  // Test as many server events as possible; right now
  // a few still need to be added because it's trickier
  // to test those ones.
  serverEvents: function(test) {

    test.expect(6);

    var server = this.server;
    var client = createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      serverEvents: {
        connecting: function() {
          test.ok(true, 'connecting event happened');
        },
        connect: function() {
          test.ok(true, 'connect event happened');
        },
        begin: function() {
          test.ok(true, 'begin event happened');
          client._disconnect();
        },
        resume: function() {
          test.ok(true, 'resume happened');
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

  }

};