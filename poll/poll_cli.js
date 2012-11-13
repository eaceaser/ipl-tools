#!/usr/bin/env node

var cli   = require('commander')
  , redis = require('redis');

cli
  .version('0.0.1') // TODO - inherit from config
  .option('-t, --track [keyword]', 'Begin tracking a keyword.')
  .parse(process.argv);

var redis = redis.createClient();
redis.on("ready", function() {
  rv = redis.publish("tracker", JSON.stringify({ command: 'track', keyword: '#yolo' }));
  redis.on("idle", function() {
    redis.quit();
    process.exit(0);
  });
});
