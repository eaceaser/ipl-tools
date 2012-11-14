var CONFIG    = require('config')
  , ntwitter  = require('ntwitter')
  , redis     = require('redis')
  , express   = require('express')
  , app       = express()
  , http      = require('http')
  , server    = http.createServer(app)
  , io        = require('socket.io').listen(server);

io.set('log level', 2);
app.use(express.bodyParser());

var twitter = new ntwitter({
  consumer_key: CONFIG.auth.consumer_key,
  consumer_secret: CONFIG.auth.consumer_secret,
  access_token_key: CONFIG.auth.access_token_key,
  access_token_secret: CONFIG.auth.access_token_secret
});

var redisSubscriber = redis.createClient();
var redisClient = redis.createClient();

redisSubscriber.on('error', function (error) {
  console.log(error);
  process.exit(1);
});

var handler = {
  streams: [],
  twitter: twitter,

  track: function(keyword, options) {
    console.log("Beginning to track: %s with options %s", keyword, options);
    redisClient.sadd("tracking", keyword);

    this.streams[keyword] = this.twitter.stream('statuses/filter', {'track': keyword}, function(stream) {
      stream.on('error', function(error, crap) {
        console.log(error);
        console.log(crap);
      });

      stream.on('data', function(data) {
        var text = data.text;
        var user = data.user;
        for (var i = 0; i < options.length; ++i) {
          var option = options[i];
          if (text.match(option)) {
            var key = keyword+":"+option;
            redisClient.incr(key, function(err, rv) {
              io.sockets.emit(keyword, { option: option, count: rv });
            });
          }
        }
      });
    });
  },

  forget: function(keyword) {
    // end tracking new keyword
    client = self.streams[keyword];
    if (client) {
      client.destroy
      self.streams[keyword] = null;
      redisClient.srem("tracking", keyword);
    }
  },

  stats: function(keyword, cb) {
    redisClient.get(keyword, function(err, rv) {
      cb(rv);
    });
  }
};

app.post('/track', function(req, res) {
  console.log(req.body);
  var kw = req.body.keyword;
  var options = req.body.option;

  handler.track(kw, options);

  // TODO: Block until the twitter client establishes conn, return value as such.
  res.send(200);
});

app.get('/results', function(req, res) {
  var keyword = req.query.keyword;
  handler.stats(keyword, function(count) {
    console.log(count);
  });
  res.send(200);
});

server.listen(8085);

// redisSubscriber.on('connect', function() {
//   redisSubscriber.subscribe('tracker');
//   console.log("Subscribed to 'tracker' channel. Waiting for messages.");
// });
// 
// 
// 
// redisSubscriber.on('message', function (channel, message) {
//   switch(channel) {
//   case 'tracker':
//     obj = JSON.parse(message);
//     fn = handler[obj.command];
//     if (typeof fn === 'function') {
//       fn(obj);
//     } else {
//       console.log("Unknown command: %s", obj.command);
//     }
//     break;
//   }
// });
