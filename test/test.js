/* jshint node:true */

// Basic tests

var _ = require('underscore');

var suite = Object.create(require('./lib/superSuite.js'));

module.exports = _.extend(suite, {

  // Test basic messaging, to and from client
  messageBasics: function(test) {

    test.expect(2);

    var server = this.server;
    var client = suite.createClient();

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
    var client1 = suite.createClient();
    var client2 = suite.createClient();

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
    var client1 = suite.createClient();
    var client2 = suite.createClient();

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
    var client = suite.createClient();

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
    var client = suite.createClient();

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

  },

  // Test that users are pruned if reconnectWait is set
  reconnectWait: function(test) {

    test.expect(4);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port,
      gameLoopSpeed: 100,
      reconnectWait: 200
    });

    client.configure({
      serverEvents: {
        begin: function() {
          setTimeout(function() {
            test.equals(server.userCount(), 1);
            client.end();
            test.equals(server.userCount(), 1);
          }, 200);

          setTimeout(function() {
            test.equals(server.userCount(), 1);
          }, 300);

          setTimeout(function() {
            test.equals(server.userCount(), 0);
            test.done();
          }, 500);
        }
      }
    });

    server.run();
    client.run(this.host);

  },

  // Test that users are pruned if reconnectWaitRoomless is set
  reconnectWaitRoomless: function(test) {

    test.expect(2);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port,
      autoJoinLobby: false,
      minRoomMembers: null,
      gameLoopSpeed: 10,
      reconnectWait: null,
      reconnectWaitRoomless: 50
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var user = server.getUsers()[0];
          var room = server.createRoom();

          user.enterRoom(room);
          client.end();

          setTimeout(function() {
            test.equals(server.userCount(), 1);
            user.leaveRoom();
          }, 100);

          setTimeout(function() {
            test.equals(server.userCount(), 0);
            test.done();
          }, 120);

        }
      }
    });

    server.run();
    client.run(this.host);

  },

  // Test create and delete room functions.
  createAndDeleteRooms: function(test) {
    test.expect(3);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var user = server.getUsers()[0];
          var room = server.createRoom('123');
          test.ok(server.getRoom(room.id), 'room exists');
          test.ok(room.name === '123', 'room name is correct');
          server.deleteRoom(room);
          test.equals(server.getRoom(room.id), false);
          test.done();
        }
      }
    });
    server.run();
    client.run(this.host);
  },

  // Test the client-side listRooms function
  listRooms: function(test) {
    test.expect(2);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      serverEvents: {
        begin: function() {
          client.listRooms(function(rooms) {
            test.equals(rooms.length, 0);
            server.createRoom('123');
            server.createRoom('456');
            server.createRoom('789');
            client.listRooms(function(rooms) {
              test.equals(rooms.length, 3);
              test.done();
            });
          });
          
        }
      }
    });
    server.run();
    client.run(this.host);
  },

  // Test server exception handling
  serverError: function(test) {
    test.expect(1);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port,
      messages: {
        error: function() {
          this.foo.bar = true; // throw a dang error
        },
        afterError: function() {
          // if we got here, the server didn't crash! yay!
          test.ok(true);
          test.done();
        }
      }
    });

    client.configure({
      serverEvents: {
        begin: function() {
          client.message('error');
          client.message('afterError');
        }
      }
    });
    server.run();
    client.run(this.host);
  },

  shouldAllowUser: function(test) {
    test.expect(2);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port,
      messages: {},
      room: {
        shouldAllowUser: function(user) {
          return this.name === 'Let me in!';
        }
      }
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var user = server.getUsers()[0];
          var room1 = server.createRoom('Not allowed!');
          var room2 = server.createRoom('Let me in!');
          test.equals(room1.addMember(user), false);
          test.equals(room2.addMember(user), true);
          test.done();
        }
      }
    });
    server.run();
    client.run(this.host);
  },

  // Test deleteUser in conjunction with connected client method.
  deleteUser: function(test) {
    test.expect(6);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var user = server.getUsers()[0];
          var room = server.createRoom('123');
          room.addMember(user);
          test.equals(server.getUsers().length, 1);
          test.equals(client.connected(), true);
          test.equals(room.getMembers().length, 1);
          server.deleteUser(user);
          test.equals(server.getUsers().length, 0);
          setTimeout(function() {
            test.equals(client.connected(), false);
            test.equals(room.getMembers().length, 0);
            test.done();
          }, 50)
        }
      }
    });

    server.run();
    client.run(this.host);
  },

  // Test Room module emitEvent does emit event.
  _emitEvent: function(test) {
    test.expect(1);

    var server = this.server;
    var client = suite.createClient();
    var eventCount = 0;
    var incrementCount = function() {
      eventCount += 1;
    };
    server.configure({
      port: this.port,
      room: {
        init: function() {
          incrementCount();
        },
        pulse: function() {
          incrementCount();
        },
        newMember: function() {
          incrementCount();
        },
        memberLeaves: function() {
          incrementCount();
        },
        close: function() {
          incrementCount();
        },
        shouldAllowUser: function() {
          incrementCount();
        }
      }
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var room = server.createRoom('123');
          room._emitEvent('pulse', this);
          room._emitEvent('newMember', this);
          room._emitEvent('memberLeaves', this);
          room._emitEvent('close', this);
          room._emitEvent('shouldAllowUser', this);
          test.equals(eventCount, 6);
          test.done();
        }
      }
    });
    server.run();
    client.run(this.host);
  },

  // Test Rooms module emitEvent passes correct context and args.
  _emitEventContext: function(test) {
    test.expect(3);

    var server = this.server;
    var client = suite.createClient();
    var stubContext = {
      cloakIsCool: true
    };
    server.configure({
      port: this.port,
      room: {
        pulse: function(arg1, arg2) {
          test.equals(this, stubContext);
          test.equals(arg1, 123);
          test.equals(arg2, 321);
          test.done();
        }
      }
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var room = server.createRoom('123');
          room._emitEvent('pulse', stubContext, [123, 321]);
        }
      }
    });
    server.run();
    client.run(this.host);
  },

  getRoom: function(test) {
    test.expect(1);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port,
      defaultRoomSize: 1
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var room = server.createRoom('123');
          var user = server.getUsers()[0];
          client.joinRoom(room.id, function(success) {
            test.equals(user.getRoom(), room);
            test.done();
          });
        }
      }
    });

    server.run();
    client.run(this.host);
  },

  // https://github.com/bocoup/cloak/issues/25
  joinRoomWithoutRoomSize: function(test) {
    test.expect(1);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      serverEvents: {
        begin: function() {
          var room = server.createRoom('123');
          var user = server.getUsers()[0];
          client.joinRoom(room.id, function(success) {
            test.equals(user.getRoom(), room);
            test.done();
          });
        }
      }
    });

    server.run();
    client.run(this.host);
  }
  
});