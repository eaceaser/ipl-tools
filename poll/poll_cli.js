#!/usr/bin/env node

var cli         = require('commander')
  , rest        = require('restler')
  , querystring = require('querystring');

cli
  .version('0.0.1') // TODO - inherit from config
  .option('-t, --track [keyword]', 'Begin tracking a keyword.')
  .option('-s, --status', 'Output current poll status.')
  .parse(process.argv);

if (cli.track) {
  rest.post('http://localhost:8085/track', {
    data: { keyword: cli.track, option:['a','b'] }
  }).on('complete', function(data, response) {
    process.exit(0);
  });
} else if (cli.status) {
  rest.get('http://localhost:8085/results', { query: { 'keyword': '#yolo' } }).on('complete', function(data, response) { });
} else {
  cli.help();
  process.exit(1);
}
