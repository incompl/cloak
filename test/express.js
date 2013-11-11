/* jshint node:true */

// Basic tests

var _ = require('underscore');
var express = require('express');

var suite = Object.create(require('./lib/superSuite.js'));

module.exports = _.extend(suite, {

  // Test basic messaging, to and from client
  integration: function(test) {

    test.expect(2);

    var express = require('express');
     
    var app = express();
    var expressServer = app.listen(3000);

    var server = this.server;
    var client = suite.createClient();

    server.configure({
      express: expressServer
    });

    client.configure({
      serverEvents: {
        connecting: function() {
          test.ok(true, 'connecting');
        },
        begin: function() {
          test.ok(true, 'begin');
          test.done();
        }
      }
    });

    server.run();

    client.run('http://localhost:3000');

  }
  
});