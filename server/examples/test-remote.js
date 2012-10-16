// We need this to build our post string
var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    express = require('express');

var app = express();
app.listen(3000);

var webRoot = path.resolve(path.dirname(module.filename), '../../client/lib/');
app.use("", express.static(webRoot));

// Build the post string from an object
var post_data = JSON.stringify({
  workerFilters: [{family: "Firefox"}, {family:"Chrome"}],
  scripts: [
    'http://localhost:3000/qunit.js',
    'http://localhost:3000/adapters/qunit.js',
    'https://raw.github.com/jquery/qunit/master/test/test.js',
    'https://raw.github.com/jquery/qunit/master/test/deepEqual.js',
    'https://raw.github.com/jquery/qunit/master/test/swarminject.js'
  ]
});

// An object of options to indicate where to post to
var post_options = {
    host: 'localhost',
    port: '80',
    path: '/test',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
    }
};

// Set up the request
var post_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('Response: ' + chunk);
    });
});

// post the data
post_req.write(post_data);
post_req.end();
