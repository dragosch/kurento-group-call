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

//mkdir node_modules/kurento-group-call && cp * node_modules/kurento-group-call && cp -r lib/ node_modules/kurento-group-call
var kurentoGroupCall = require('kurento-group-call');

var path = require('path');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var MemoryStore = session.MemoryStore;
var minimist = require('minimist');
var url = require('url');
var authenticatedSockets = {};


var argv = minimist(process.argv.slice(2), {
  default: {
    as_uri: 'http://localhost:8080/',
    ws_uri: 'ws://localhost:8888/kurento'
  }
});


var app = express();

var parseCookie = cookieParser();
var store = new MemoryStore();

app.use(parseCookie);
app.use(session({
    store: store,
    secret: '123456',
    key: 'sid'
    })
  );

app.get('/users', function (req, res) {
  var userIds = [];
  for (var key in authenticatedSockets) {
    if (authenticatedSockets.hasOwnProperty(key)) {
      userIds.push(key);
    }
  }
  res.send(userIds);
});

function initWebRtc(socket){
  var sessionId = socket.id;
  console.log('initWebRtc: sessionId=', sessionId );
  var sendMessage = function( messageName, data ) {
    socket.emit(messageName, data);
  };
  kurentoGroupCall.start('ws://52.17.163.149:8888/kurento', sessionId,
      sendMessage);
  socket.on('error', function(error){
    kurentoGroupCall.onError(error, sessionId);
  });
  socket.on('close', function(){
    kurentoGroupCall.onClose(sessionId);
  });
  socket.on('startNewCall', function(data){
    kurentoGroupCall.onStartNewCall(data, sessionId, sendMessage);
  });
  socket.on('incomingCallAnswer', function(data){
    kurentoGroupCall.onIncomingCallAnswer(data, sessionId, sendMessage);
  });
  socket.on('receiveVideoFrom', function(data){
    kurentoGroupCall.onReceiveVideoFrom(data, sessionId);
  });
  socket.on('message', function(data){
    kurentoGroupCall.onMessage(data, sessionId, sendMessage);
  });
  socket.on('inviteUsers', function(data){
    console.log('inviteUsers: ', data.userIds);

    var currentUserId = socket.id;
    console.log('inviteUsers: currentUserId=', currentUserId, ' socketId=', socket.id);
    var length = data.userIds.length;
    for (var i = 0; i < length; i++) {
      var userId = data.userIds[i];
      var socks = authenticatedSockets[userId];
      if (socks) {
        console.log('inviteUsers: send incomingCall message', socks.id);
        socks.emit('incomingCall', { from: currentUserId, callId: data.callId } );
      } else {
        console.log('ERROR user not connected: userId=', userId);
      }
    }
  });
};


var initWebSockets = function(server) {
  console.log('initWebSockets:');
};

/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = app.listen(port, function () {
  console.log('Kurento Tutorial started');
  console.log('Open ' + url.format(asUrl) +
    ' with a WebRTC capable browser');
});
var io = require('socket.io').listen(server);


io.on('connection', function (socket) {
  console.log('CONNECT');
  authenticatedSockets[socket.id] = socket;
  initWebRtc(socket);

  socket.on('disconnect', function () {
    console.log('CLOSE');
    delete authenticatedSockets[socket.id];
  });
});




app.use(express.static(path.join(__dirname, 'static')));
