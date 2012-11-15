#!/usr/bin/env node

var CONFIG  = require('config')
  , express = require('express');

var app = express();
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('index');
});

app.listen(8086);
