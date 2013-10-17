/* jshint node:true */

// Timer tests

var _ = require('underscore');

var suite = Object.create(require('./lib/superSuite.js'));

module.exports = _.extend(suite, {

  // Test that the timer events get triggered properly
  timerEvents: function(test) {
    test.expect(4);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      port: this.port
    });

    client.configure({
      timerEvents: {
        myTimer: function(millis) {
          test.ok(millis > 90);
          test.ok(millis < 110);
          test.done();
        }
      }
    });

    server.run();
    client.run(this.host);

    var timer = server.createTimer('myTimer');
    timer.start();
    setTimeout(function() {
      test.ok(timer.getValue() > 90);
      test.ok(timer.getValue() < 110);
      timer.sync(server.getUsers()[0]);
    }, 100);

  },

  // Timer that counts down
  descending: function(test) {
    test.expect(2);

    var timer = this.server.createTimer('myTimer', 100, true);
    timer.start();
    setTimeout(function() {
      test.ok(timer.getValue() > -10);
      test.ok(timer.getValue() < 10);
      test.done();
    }, 100);

  },

  // Test stopping and starting a timer
  stopStart: function(test) {
    test.expect(2);

    var timer = this.server.createTimer('myTimer');
    timer.start();
    setTimeout(function() {
      timer.stop();
      setTimeout(function() {
        timer.start();
        setTimeout(function() {
          test.ok(timer.getValue() > 190);
          test.ok(timer.getValue() < 210);
          test.done();
        }, 100);
      }, 100);
    }, 100);

  },

  // Test reset method
  reset: function(test) {
    test.expect(2);

    var timer = this.server.createTimer('myTimer');
    timer.start();
    setTimeout(function() {
      timer.reset();
      timer.start();
      setTimeout(function() {
        test.ok(timer.getValue() > 90);
        test.ok(timer.getValue() < 110);
        test.done();
      }, 100);
    }, 100);

  }

});