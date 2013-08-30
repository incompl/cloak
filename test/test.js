/* jshint node:true */

var connect = require('connect');
var path = require('path');
var _ = require('underscore');
var io = require('socket.io-client');

var cloakServer = require('../src/server/cloak');
var createCloakClient = require('../src/client/cloak');

var clients;

function createServer() {
  return cloakServer;
}

function createClient() {
  var client = createCloakClient();
  client._setLibs(_, io);
  clients.push(client);
  return client;
}

module.exports = {

  setUp: function(callback) {
    try {
      this.port = 8091;
      this.host = 'http://localhost:' + this.port;
      console.log('creating server');
      this.server = createServer();
      clients = [];
      callback();
    }
    catch(e) {
      console.error(e);
    }
  },

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