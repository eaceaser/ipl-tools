var CONFIG  = require('config')
  , redis    = require('redis')
  , app      = require('http').createServer(handler)
  , io       = require('socket.io').listen(app)
  , fs       = require('fs')
  , ntwitter = require('ntwitter');

io.set('log level', 2);

var twitter = new ntwitter({
  consumer_key: CONFIG.auth.consumer_key,
  consumer_secret: CONFIG.auth.consumer_secret,
  access_token_key: CONFIG.auth.access_token_key,
  access_token_secret: CONFIG.auth.access_token_secret
});

var redisClient = redis.createClient();
redisClient.on('error', function (error) {
  console.log(error);
  process.exit(1);
});

// tweet processing
var TWEETS_LIST_MAX = 500;
var TWEETS_LIST = "tweets_list";

var stats = {
  tweets: 0,
  droppedTweets: 0
};

function printStats() {
  redisClient.llen(TWEETS_LIST, function(err, tweetsListLen) {
    console.log("tweets_list length: " + tweetsListLen);
    console.log("tweets\n  total: " + stats.tweets + "\n  droppedTweets: " + stats.droppedTweets);
  });
}

// socket.io

app.listen(8080);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

var clients = {}

io.sockets.on('connection', function (socket) {
  console.log('SOCKETS: connection');

  clients[socket] = {
    stream: {},
    tweets: {}
  }

  socket.on('tracker', function (tracker) {
    console.log("SOCKET: tracker: " + JSON.stringify(tracker));

    switch(tracker.command) {
    case 'track':
      clients[socket].stream = twitter.stream('statuses/filter', {'track': tracker.keywords}, function(stream) {
        stream.on('data', function(data) {
          redisClient.rpush(TWEETS_LIST, JSON.stringify(data));
        });

        stream.on('error', function(error, crap) {
          console.log(error);
          console.log(crap);
        });
      });
      break;
    }

    clients[socket].tweets = setInterval(function() {
      redisClient.rpop(TWEETS_LIST, function(err, result) {
        if (result == null) {
          return;
        }

        socket.emit('tweet', result);

        stats.tweets += 1;

        if (stats.tweets % 100 == 0) {
          redisClient.llen(TWEETS_LIST, function(err, len) {
            if (len > TWEETS_LIST_MAX) {
              stats.droppedTweets += len
              console.log('tweets_list at max size, trimming');
              redisClient.ltrim(TWEETS_LIST, 0, 0, function(err, results) {});
            }
          });

          printStats();
        }
      });
    }, 10);
  });

  socket.on('disconnect', function () {
    console.log('SOCKET: disconnect');

    clients[socket].stream.destroy;
    clearInterval(clients[socket].tweets);
  });
});
