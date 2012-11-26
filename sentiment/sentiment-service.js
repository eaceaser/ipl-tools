var CONFIG     = require('config')
  , ntwitter   = require('ntwitter')
  , redis      = require('redis')
  , express    = require('express')
  , app        = express()
  , http       = require('http')
  , server     = http.createServer(app)
  , io         = require('socket.io').listen(server)
  , natural    = require('natural')
  , classifier = new natural.BayesClassifier();

var NAMESPACE="sentiment:";

io.set('log level', 2);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/views'));

var redisClient = redis.createClient();
var twitter = new ntwitter({
  consumer_key: CONFIG.auth.consumer_key,
  consumer_secret: CONFIG.auth.consumer_secret,
  access_token_key: CONFIG.auth.access_token_key,
  access_token_secret: CONFIG.auth.access_token_secret
});

// Train
classifier.addDocument(['win', 'good', 'pro', 'gosu', 'pro', 'leet', 'elite'], 'win');
classifier.addDocument(['lose', 'sucks', 'bad', 'l2p', 'derp', 'noob', 'chobo', 'nub', 'newbie', 'dead', 'shit'], 'lose');
classifier.train();

var handler = {
  twitter: twitter,
  redis: redisClient,
  stream: null,
  listeners: [],
  currentKeywords: [],
  weight: 0.0,

  addListener: function(socket) {
    this.listeners[socket.id] = function(message) {
      socket.emit('sentiment', message);
    };
  },

  removeListener: function(socket) {
    delete this.listeners[socket];
  },

  track: function(track) {
    var kws = track.split(/,/);
    kws.map(function(kw) {
      handler.currentKeywords.push(kw);
    });
    var query = this.currentKeywords.join(",");

    console.log("Opening stream with track: %s", query);
    if (this.stream) {
      this.stream.destroy;
      this.stream = null;
    }

    this.stream = this.twitter.stream('statuses/filter', { 'track': query }, function(stream) {
      stream.on('error', function(error, msg) {
        console.log("Stream %s errored with: %s %s", track, error, msg);
      });

      stream.on('data', function(data) {
        if (data.disconnect) {
          console.log("Stream disconnected.");
          return;
        }

        var text = data.text;
        var classified = classifier.getClassifications(text);
        var values = [];
        for (var i in classified) {
          var c = classified[i];
          values[c.label] = c.value;
        }

        var label = null;
        var cnt = 0;
        if (values['win'] > values['lose'])  {
          label = "win";
          if (handler.weight < 1) {
            handler.weight += .01;
          }
        } else if (values['lose'] > values['win']) {
          label = "lose";
          if (handler.weight > -1) {
            handler.weight -= .01;
          }
        }

        if (label != null) {
          for (i in handler.listeners) {
            var l = handler.listeners[i];
            l({keyword: "x", value: handler.weight * 100});
          }
        }
      });

      stream.on('end', function(resp) {
        console.log("Stream hung up: %s", resp);
      });

      stream.on('destroy', function(resp) {
        console.log("Stream destroyed: %s", resp);
      });
    });

  }
};

io.sockets.on('connection', function(socket) {
  handler.addListener(socket);

  socket.on('disconnect', function() {
    handler.removeListener(socket);
  });
});

app.post('/track', function(req, res) {
  var query = req.body.track;
  handler.track(query);
  res.json("ok");
});

app.get('/', function(req, res) { res.static('index.html'); });
server.listen(8086);
