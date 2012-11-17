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
app.enable("jsonp callback");

var twitter = new ntwitter({
  consumer_key: CONFIG.auth.consumer_key,
  consumer_secret: CONFIG.auth.consumer_secret,
  access_token_key: CONFIG.auth.access_token_key,
  access_token_secret: CONFIG.auth.access_token_secret
});

var redisClient = redis.createClient();

var handler = {
  streams: [],
  listeners: [],
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
            var opt = new String(option);
            redisClient.incr(key, function(err, rv) {
              for (l in handler.listeners) {
                handler.listeners[l]({keyword: keyword, option: opt, count: rv});
              }
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

io.sockets.on('connection', function (socket) {
  handler.listeners[socket] = function (message) {
    socket.emit('vote', message);
  };

  socket.on('disconnect', function() {
    delete handler.listeners[socket]
  });
});

app.post('/track', function(req, res) {
  var kw = req.body.keyword;
  var options = req.body.option.filter(function(e, i, a) {
    return e.length > 0;
  });

  handler.track(kw, options);

  // TODO: Block until the twitter client establishes conn, return value as such.
  res.json("ok");
});

app.get('/results', function(req, res) {
  var keyword = req.query.keyword;
  handler.stats(keyword, function(count) {
    console.log(count);
  });
  res.send(200);
});

server.listen(8085);
