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

var RoomManager = require('./backend/room_manager');
var UserRegistry = require('./backend/user_registry');
var ws = require('ws');

var userRegistry = new UserRegistry();
var roomManager;
var wss;

function leaveRoom(userSession) {
  if (userSession === null || userSession === undefined) {
    return;
  }
  console.log('PARTICIPANT ' + userSession.getUserName() + ' leaves room ' +
    userSession.getRoomName());
  roomManager.getRoom(userSession.getRoomName(), function (error, room) {
    if (error) {
      console.log('ERROR: ' + error);
      return;
    }
    if (room) {
      room.leave(userSession);
      if (room.isEmpty()) {
        console.log('Room ' + room.getName() + ' is empty.');
        roomManager.removeRoom(room);
      }
    }
  });
}

function joinRoom(message, sessionId, wsSession) {

  var userName = message.name;
  console.log('PARTICIPANT ', userName, ': trying to join room ', message.room);

  roomManager.getRoom(message.room, function (error, room) {
    console.log('getRoom:', room);
    if (room) {
      room.join(userName, wsSession, sessionId, userRegistry);
    }
  });
}


module.exports = {
  start: function(expressServer, ws_uri, store, parseCookie) {
    roomManager = new RoomManager(ws_uri);
    wss = new ws.Server({
      server: expressServer,
      path: '/groupcall'
    });

wss.on('connection', function (ws) {
  var sessionId;

  parseCookie(ws.upgradeReq, null, function (err) {
    if (err) {
      console.log('ERROR: ' + err);
      return;
    }
    sessionId = ws.upgradeReq.cookies.sid;
    console.log('Connection received with sessionId ' + sessionId);
    store.get(sessionId, function (err, session) {
      if (err) {
        console.log('ERROR: ' + err);
      }
      // session
    });
  });

  ws.on('error', function (error) {
    console.log('Connection ' + sessionId + ' error:' + error);
    var user = userRegistry.getBySessionId(sessionId);
    leaveRoom(user);
    userRegistry.removeBySession(sessionId);
  });

  ws.on('close', function () {
    console.log('Connection ' + sessionId + ' closed');
    var user = userRegistry.getBySessionId(sessionId);
    leaveRoom(user);
    userRegistry.removeBySession(sessionId);
  });

  ws.on('message', function (_message) {
    var message = JSON.parse(_message);
    console.log('Connection ' + sessionId + ' received message '); //, message);

    var user = userRegistry.getBySessionId(sessionId);

    if (user) {
      console.log('Incoming message from user ', user.getUserName(),
        ': id=', message.id);
    } else {
      console.log('Incoming message from new user : id=', message.id);
    }

    switch (message.id) {
    case 'joinRoom':
      joinRoom(message, sessionId, ws);
      break;

    case 'receiveVideoFrom':
      var sender = userRegistry.getByName(message.sender);
      user.receiveVideoFrom(sender, message.sdpOffer);
      break;
    case 'leaveRoom':
      leaveRoom(user);
      break;

    default:
      console.log('Invalid message');
      ws.send(JSON.stringify({
        id: 'error',
        message: 'Invalid message ' + message
      }));
      break;
    }

  });

});
}


};

