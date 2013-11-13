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
          client._connect();
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

    test.expect(7);

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
        begin: function() {
          test.ok(true, 'begin event happened');
          client._disconnect();
        },
        disconnect: function() {
          test.ok(true, 'disconnect event happened');
          client._connect();
        },
        resume: function() {
          test.ok(true, 'resume event happened');
          client.end();
        },
        end: function() {
          test.ok(true, 'end event happened');
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

  },

  connectionError: function(test) {

    test.expect(1);

    var client = suite.createClient();

    client.configure({
      serverEvents: {
        error: function(arg) {
          test.ok(arg.match('ECONNREFUSED'));
          test.done();
        }
      }
    });

    client.run(this.host + '123');

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

  // Test the server-side listRooms function
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
          var rooms = server.listRooms();
          test.equals(rooms.length, 0);
          server.createRoom('123');
          server.createRoom('456');
          server.createRoom('789');
          rooms = server.listRooms();
          test.equals(rooms.length, 3);
          test.done();
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
          }, 50);
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
          server.joinRoom(user, room);
          test.equals(user.getRoom(), room);
          test.done();
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
          server.joinRoom(user, room);
          test.equals(user.getRoom(), room);
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);
  },

  minRoomMembers: function(test) {

    var server = this.server;
    var client1 = suite.createClient();
    var client2 = suite.createClient();

    test.expect(4);

    var gameLoopSpeed = 100;

    var done = false;

    server.configure({
      port: this.port,
      minRoomMembers: 2,
      gameLoopSpeed: gameLoopSpeed,
      lobby: {
        newMember: function(user) {
          if (this.getMembers().length > 1 && !done) {
            done = true;
            var room = server.createRoom();

            server.getUsers().forEach(function(user) {
              room.addMember(user);
            });

            server.getUsers().forEach(function(user) {
              test.ok(!user.getRoom().isLobby);
            });

            room.removeMember(server.getUsers()[0]);

            setTimeout(function() {
              server.getUsers().forEach(function(user) {
                test.ok(user.getRoom().isLobby);
              });
              test.done();
            }, gameLoopSpeed);

          }
        }
      }
    });

    client1.configure({});
    client2.configure({});

    server.run();
    client1.run(this.host);
    client2.run(this.host);

  },

  pruneEmptyRooms: function(test) {

    var server = this.server;

    test.expect(2);

    var pruneEmptyRooms = 500;

    server.configure({
      port: this.port,
      pruneEmptyRooms: pruneEmptyRooms
    });

    server.run();

    var room = server.createRoom();
    var id = room.id;

    test.ok(server.getRoom(id));

    setTimeout(function() {
      test.ok(!server.getRoom(id));
      test.done();
    }, pruneEmptyRooms + 100);

  },

  // unit test for server messageAll.
  messageAll: function(test) {
    var server = this.server;
    var client1 = suite.createClient();
    var client2 = suite.createClient();
    var messages = 2;

    server.configure({
      port: this.port,
      autoJoinLobby: true,
    });

    var helloHandler = function(data) {
      if (data === 'world') {
        --messages || test.done();
      }
    };

    client1.configure({
      messages: {
        hello: helloHandler
      }
    });

    client2.configure({
      messages: {
        hello: helloHandler
      }
    });

    server.run();
    client1.run(this.host);
    client2.run(this.host);

    setTimeout(function() {
      server.messageAll('hello', 'world');
    }, 50);
  },

  notifyRoomChanges: function(test) {

    var server = this.server;
    var client = suite.createClient();

    test.expect(2);

    var room;

    server.configure({
      port: this.port,
      lobby: {
        newMember: function(user) {
          room = server.createRoom();
        }
      }
    });

    client.configure({
      serverEvents: {
        roomCreated: function() {
          test.ok(true);
          server.deleteRoom(room);
        },
        roomDeleted: function() {
          test.ok(true);
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

  },

  // test client roomMember function is equivalent to servers.
  getRoomMembers: function(test) {
    var that = this;
    var done = false;
    var server = this.server;
    var client1 = suite.createClient();
    var client2 = suite.createClient();
    var room;
    var members;
    test.expect(1);

    server.configure({
      port: this.port,
      lobby: {
        newMember: function(user) {
          room = room || server.createRoom();
          room.addMember(user);
        }
      },
      room: {
        newMember: function(user) {
          if (this.getMembers().length === 2 && !done) {
            done = true;
            members = this.getMembers()
            server.getUsers()[0].message('test', null);
          }
        }
      }
    });

    client1.configure({
      messages: {
        test: function() {
          client1.getRoomMembers(room.id, function(users) {
            test.ok(_.isEqual(users, members));
            test.done();
          })
        }
      }
    });

    client2.configure({});

    server.run();

    client1.run(this.host);
    // force client2 to be second in userlist.
    setTimeout(function() {
      client2.run(that.host);
    }, 50);
  },

  // test lobby autojoin in conjunction with leave room.
  autoJoinLobby: function(test) {
    var server = this.server;
    var done = false;
    var client = suite.createClient();
    test.expect(1);

    server.configure({
      port: this.port,
      autoJoinLobby: true,
      messages: {
        test: function(msg, user) {
          test.ok(user.getRoom().isLobby);
          test.done();
        }
      },
      lobby: {
        newMember: function(user) {
          if (!done) {
            done = true;
            var user = server.getUsers()[0];
            room = server.createRoom();
            room.addMember(user);
            user.message('test', null);
          }
        }
      }
    });

    client.configure({
      messages: {
        test: function() {
          client.leaveRoom(function() {
            client.message('test', null);
          })
        }
      }
    });

    server.run();
    client.run(this.host);
  },

  // setting and getting room data.
  settingRoomData: function(test) {
    var that = this;
    var server = this.server;
    var client1 = suite.createClient();
    var client2 = suite.createClient();
    test.expect(1);

    server.configure({
      port: this.port,
      autoCreateRooms: true,
      minRoomMembers: 2,
      messages: {
        setData: function(data, user) {
          var room = user.getRoom();
          room.data = data;
        },
        getData: function(data, user) {
          var room = user.getRoom();
          user.message('data', room.data);
        }
      }
    });

    client1.configure({
      serverEvents: {
        joinedRoom: function() {
          client1.message('setData', {
            number: 42
          });
        }
      }
    });

    client2.configure({
      serverEvents: {
        joinedRoom: function() {
          client2.message('getData');
        }
      },
      messages: {
        data: function(data) {
          test.equals(data.number, 42);
          test.done();
        }
      }
    });

    server.run();
    client1.run(this.host);
    setTimeout(function() {
      client2.run(that.host);
    }, 50);
  }

});
