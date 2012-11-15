#!/usr/bin/env node

var CONFIG  = require('config')
  , express = require('express')
  , app     = express()
  , http    = require('http')
  , server  = http.createServer(app)
  , io      = require('socket.io').listen(server);

app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('index');
});

console.log("Listening.");
server.listen(8086);
