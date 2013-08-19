/* jshint node:true */

// This is a simple server for development purposes
// Run with "node test-server"

var connect = require('connect');
var path = require('path');

var port = process.env.PORT || 8080;

connect()
.use(connect.static(path.resolve(__dirname)))
.listen(port);

console.log('Listening on ' + port);
