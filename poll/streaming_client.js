var CONFIG    = require('config')
  , ntwitter  = require('ntwitter')
  , redis     = require('redis');

var twitter = new ntwitter({
  consumer_key: CONFIG.auth.consumer_key,
  consumer_secret: CONFIG.auth.consumer_secret,
  access_token_key: CONFIG.auth.access_token_key,
  access_token_secret: CONFIG.auth.access_token_secret
});

var redis = redis.createClient();

redis.on('error', function (error) {
  console.log(error);
  process.exit(1);
});

var handler = function _create(){
  var self = Object.create({});
  self.streams = [];
  self.twitter = twitter;

  self.track = function(keyword) {
    console.log("Beginning to track: %s", keyword);
    self.streams[keyword] = self.twitter.stream('statuses/filter', {'track': keyword}, function(stream) {
      stream.on('error', function(error, crap) {
        console.log(error);
        console.log(crap);
      });

      stream.on('data', function(data) {
        console.log(data);
      });
    });
  };

  self.forget =  function(keyword) {
    // end tracking new keyword
    client = self.streams[keyword];
    if (client) {
      client.destroy
    }
  }

  return self
}();

redis.on('connect', function() {
  redis.subscribe('tracker');
  console.log("Subscribed to 'tracker' channel. Waiting for messages.");
});

redis.on('message', function (channel, message) {
  switch(channel) {
  case 'tracker':
    obj = JSON.parse(message);
    fn = handler[obj.command];
    if (typeof fn === 'function') {
      fn(obj.keyword);
    } else {
      console.log("Unknown command: %s", obj.command);
    }
    break;
  }
});
