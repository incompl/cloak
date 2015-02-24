/* jshint node:true */

// clientEvents tests

var _ = require('underscore');

var suite = Object.create(require('./lib/superSuite.js'));

module.exports = _.extend(suite, {

  clientEvents: function(test) {

    test.expect(8);

    var server = this.server;
    var client = suite.createClient();
    var detected;
    var eventsOrder = [];
    var currentUser;

    server.configure({
      port: this.port,
      clientEvents: {
        begin: function (user) {
          currentUser = user.id;
          eventsOrder.push('begin');
          test.ok(true, 'begin event happened');
        },
        disconnect: function (user) {
          if (!detected) {
            eventsOrder.push('disconnect');
            test.ok(true, 'disconnect event happened');
            test.equal(user.id, client.currentUser());
            test.equal(user.id, currentUser);
            client._connect();
            detected = true;
          }
        },
        resume: function (user) {
          test.ok(true, 'resume event happened');
            eventsOrder.push('resume');
            test.equal(user.id, client.currentUser());
            test.equal(user.id, currentUser);
            test.deepEqual(eventsOrder, ['begin', 'disconnect', 'resume']);
            setTimeout(function () {
              test.done();
            });
        }
      }
    });

    client.configure({
      serverEvents: {
        begin: function() {
          client._disconnect();
        }
      }
    });

    server.run();
    client.run(this.host);

  }

});
