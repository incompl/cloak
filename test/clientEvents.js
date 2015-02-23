/* jshint node:true */

// clientEvents tests

var _ = require('underscore');

var suite = Object.create(require('./lib/superSuite.js'));

module.exports = _.extend(suite, {

  clientEvents: function(test) {

    test.expect(4);

    var server = this.server;
    var client = suite.createClient();
    var detected;

    server.configure({
      port: this.port,
      clientEvents: {
        disconnect: function (user) {
          if (!detected) {
            test.ok(true, 'disconnect event happened');
            test.equal(user.id, client.currentUser());
            client._connect();
            detected = true;
          }
        },
        resume: function (user) {
          test.ok(true, 'resume event happened');
            test.equal(user.id, client.currentUser());
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
