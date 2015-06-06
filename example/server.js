/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 MAPT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

'use strict';

var kurentoGroupCall = require('../lib/server.js');

var path = require('path');
var express = require('express');
var MemoryStore = express.session.MemoryStore;
var minimist = require('minimist');
var url = require('url');

var argv = minimist(process.argv.slice(2), {
  default: {
    as_uri: 'http://localhost:8080/',
    //ws_uri: 'ws://localhost:8888/kurento'
    ws_uri: 'ws://52.17.163.149:8888/kurento'
  }
});


var app = express();

var parseCookie = express.cookieParser();
var store = new MemoryStore();
app.configure(function () {
  app.use(parseCookie);
  app.use(express.session({
    store: store,
    secret: '123456',
    key: 'sid'
  }));
});

/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = app.listen(port, function () {
  console.log('Kurento Tutorial started');
  console.log('Open ' + url.format(asUrl) +
    ' with a WebRTC capable browser');
  kurentoGroupCall.start(server, argv.ws_uri, store, parseCookie);
});


app.use(express.static(path.join(__dirname, 'static')));
