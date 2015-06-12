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

var CallManager = require('./backend/call_manager');
var UserRegistry = require('./backend/user_registry');

var authenticatedSockets = {};
var userRegistry = new UserRegistry();
var callManager = null;
var wss;
var shortid = require('shortid');

function leaveRoom(userSession) {
  if (userSession === null || userSession === undefined) {
    return;
  }
  console.log('PARTICIPANT ' + userSession.getUserName() + ' leaves call ' +
    userSession.getCallId());
  callManager.getCall(userSession.getCallId(), function (error, call) {
    if (error) {
      console.log('ERROR: ' + error);
      return;
    }
    if (call) {
      call.leave(userSession);
      if (call.isEmpty()) {
        console.log('Call ' + call.getId() + ' is empty.');
        callManager.removeCall(call);
      }
    }
  });
}

function startNewCall(message, sessionId, wsSession) {

  console.log(message)
  var userName = message.userId;
  var callId = userName + '_' + shortid.generate();
  console.log('PARTICIPANT ', userName, ': trying to join call ', callId);

  callManager.getCall(callId, function (error, call) {
    console.log('getCall:', call);
    if (call) {
      call.join(userName, wsSession, sessionId, userRegistry);
    }
  });
}

function joinCall_deprecated(message, sessionId, wsSession) {

  var userName = message.name;
  console.log('PARTICIPANT ', userName, ': trying to join call ', message.room);

  callManager.getCall(message.room, function (error, room) {
    console.log('getCall:', room);
    if (call) {
      call.join(userName, wsSession, sessionId, userRegistry);
    }
  });
}


module.exports = {

  start: function(ws_uri, pAuthenticatedSockets, socket, sessionId) {
    if (callManager === null) {
      callManager = new CallManager(ws_uri);
    }

    authenticatedSockets = pAuthenticatedSockets;

    socket.on('error', function (error) {
      console.log('Connection ' + sessionId + ' error:' + error);
      var user = userRegistry.getBySessionId(sessionId);
      leaveRoom(user);
      userRegistry.removeBySession(sessionId);
    });

  socket.on('close', function () {
    console.log('Connection ' + sessionId + ' closed');
    var user = userRegistry.getBySessionId(sessionId);
    leaveRoom(user);
    userRegistry.removeBySession(sessionId);
  });

  socket.on('inviteUsers', function(data){
    console.log('inviteUsers: ', data.userIds);
    
    var currentUserId = socket.client.user._id;
    console.log('inviteUsers: currentUserId=', currentUserId, ' socketId=', socket.id);
    var length = data.userIds.length;
    for (var i = 0; i < length; i++) {
      var userId = data.userIds[i];
      var socks = authenticatedSockets[userId];
      if (socks) {
        console.log('inviteUsers: send incomingCall message', socks[0].id);
        socks[0].emit('incomingCall', { from: currentUserId, callId: data.callId } );
      } else {
        console.log('ERROR user not connected: userId=', userId);
      }
    }
  });


  socket.on('incomingCallAnswer', function(data){
    console.log('incomingCallAnswer: ', data.from, data.answer);
    if (data.answer === 'accepted') {
      var userId = data.from;
      var callId = data.callId;
      console.log('PARTICIPANT ', userId, ': trying to join call ', callId);

      callManager.getCall(callId, function (error, call) {
        console.log('getCall:', call);
        if (call) {
          call.join(userId, socket, sessionId, userRegistry);
        }
      });
    }
  });


  socket.on('message', function (message) {
    console.log('Connection ' + sessionId + ' received message ', message);

    var user = userRegistry.getBySessionId(sessionId);

    if (user) {
      console.log('Incoming message from user ', user.getUserName(),
        ': id=', message.id);
    } else {
      console.log('Incoming message from new user : id=', message.id);
    }

    switch (message.id) {
    case 'startNewCall':
      startNewCall(message, sessionId, socket);
      break;
    case 'joinRoom':
      joinCall_deprecated(message, sessionId, socket);
      break;

    case 'receiveVideoFrom':
      var sender = userRegistry.getByName(message.sender);
      user.receiveVideoFrom(sender, message.sdpOffer);
      break;
    case 'leaveRoom':
      leaveRoom(user);
      break;
    case 'getRooms':
      user.sendMessage({
        id: 'allRooms',
        rooms: callManager.getCallIds()
      });
      break;
    case 'closeRoom':
      //TODO only admins should have the right of closing rooms
      callManager.removeCall(message.roomId);
      break;

    default:
      console.log('Invalid message');
      socket.emit({
        id: 'error',
        message: 'Invalid message ' + message
      });
      break;
    }

  });

}


};

