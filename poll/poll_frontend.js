#!/usr/bin/env node

var CONFIG  = require('config')
  , express = require('express')
  , app     = express()
  , http    = require('http')
  , server  = http.createServer(app)
  , io      = require('socket.io').listen(server);

app.use(express.logger('dev'));
app.use(express.static(__dirname + '/views'));

app.get('/', function(req, res) {
  res.static('index.html');
});

console.log("Listening.");
server.listen(8086);
