/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */

var socket = io.connect('http://' + location.host + '/');
var currentUserId = null;
var showInviteDialog = true;
var participants = {};
var name;
var callId = null;
var users = [];

socket.on('existingParticipants', onExistingParticipants);
socket.on('incomingCall', onIncomingCall);
socket.on('connect', function(){
  currentUserId = socket.id;
  console.log('connect: socket.id=', currentUserId);
});

socket.on('message', function (message) {
  var parsedMessage = message;
  console.info('Received message: ', message);

  switch (parsedMessage.id) {
    case 'newParticipantArrived':
      onNewParticipant(parsedMessage);
      break;
    case 'participantLeft':
      onParticipantLeft(parsedMessage);
      break;
    case 'receiveVideoAnswer':
      receiveVideoAnswer(parsedMessage);
      break;
    case 'allRooms':
      receiveAllRooms(parsedMessage);
      break;
    default:
      console.error('Unrecognized message', parsedMessage);
  }
});


window.onbeforeunload = function() {
  socket.close();
};

function sendMessage() {
  var messageName = 'message';
  var message;
  if (arguments.length === 1) {
    message = arguments[0];
  }
  else
  if (arguments.length === 2) {
    messageName = arguments[0];
    message = arguments[1];
  }
  else {
    console.log('ERROR: invalid number of arguments.');
    return;
  }
  console.log('Sending message:', messageName, message);
  socket.emit(messageName, message);
}

startNewCall = function () {
  document.getElementById('join').style.display = 'none';
  document.getElementById('room').style.display = 'block';
  
  if (currentUserId === null) {
    currentUserId = socket.id;
  }

  var message = {
    id: 'startNewCall',
    userId: currentUserId
  };
  sendMessage(message);
};

showAcceptCallDialog = function() {
  document.getElementById('acceptcall').className = 'modal show';
};
hideAcceptCallDialog = function() {
  document.getElementById('acceptcall').className = 'modal hide';
};

acceptCall = function() {
  console.info('accept call ', callId);
  document.getElementById('join').style.display = 'none';
  document.getElementById('room').style.display = 'block';
  sendIncomingCallAnswer('accepted', callId);
  hideAcceptCallDialog();
};
rejectCall = function() {
  console.info('reject call');
  sendIncomingCallAnswer('rejected', callId);
  hideAcceptCallDialog();
};
hideInviteUsersDialog = function() {
  console.info('hideInviteUsersDialog');
  document.getElementById('inviteusers').className = 'modal hide';
};
showInviteUsersDialog = function() {
  var element = document.getElementById('userlist');
  while(element.firstChild) {
    element.removeChild(element.firstChild);
  }
    console.log( location.host );
  $.ajax({
    url: 'http://' + location.host + '/users'
  }).then(function(data) {
    console.log(data);
    users = data
    createCheckBoxes(element, users);
    document.getElementById('inviteusers').className = 'modal show';
  });
};


inviteUsers = function() {
  console.info('inviteUsers');
  var userIds = [];
  for (var i = 0; i < users.length; i++) {
    var chkbox = document.getElementById('chk_'+users[i]);
  console.info('inviteUsers ', chkbox);
    if (chkbox){
  console.info('inviteUsers 1');
      if (chkbox.checked) {
  console.info('inviteUsers 2');
        userIds.push( users[i] );
      }
    }
  }
  console.log( userIds );
  var msg = {
    id: 'inviteUsers',
    userIds: userIds,
    callId: callId
  };
  sendMessage('inviteUsers', msg);
  hideInviteUsersDialog();
};


function receiveVideoAnswer(result) {
  participants[result.name].rtcPeer.processSdpAnswer(result.sdpAnswer);
  if (currentUserId === result.callerId && showInviteDialog === true) {
    showInviteDialog = false;
    showInviteUsersDialog();
  }
}
function sendIncomingCallAnswer(answer, pCallId) {
  var responseMsg = {
    id    : 'incomingCallAnswer',
    from  : currentUserId,
    answer: answer, //accepted | rejected
    callId: pCallId
  };
  sendMessage('incomingCallAnswer', responseMsg);
}
function onIncomingCall(msg) {
  console.log('onIncomingCall:', msg);
  callId = msg.callId;
  showAcceptCallDialog();
}



socket.on('message', function(message) {
    var parsedMessage = JSON.parse(message.data);
    console.info('Received message: ' + message.data);

    switch (parsedMessage.id) {
    case 'existingParticipants':
        onExistingParticipants(parsedMessage);
        break;
    case 'newParticipantArrived':
        onNewParticipant(parsedMessage);
        break;
    case 'participantLeft':
        onParticipantLeft(parsedMessage);
        break;
    case 'receiveVideoAnswer':
        receiveVideoResponse(parsedMessage);
        break;
    default:
        console.error('Unrecognized message', parsedMessage);
    }
});

function register() {
    name = document.getElementById('name').value;
    var room = document.getElementById('roomName').value;

    document.getElementById('room-header').innerText = 'ROOM ' + room;
    document.getElementById('join').style.display = 'none';
    document.getElementById('room').style.display = 'block';

    var message = {
        id : 'joinRoom',
        name : name,
        room : room,
    }
    sendMessage(message);
}

function onNewParticipant(request) {
    receiveVideo(request.name);
}

function receiveVideoResponse(result) {
    participants[result.name].rtcPeer.processSdpAnswer(result.sdpAnswer);
}

function callResponse(message) {
    if (message.response != 'accepted') {
        console.info('Call not accepted by peer. Closing call');
        stop();
    } else {
        webRtcPeer.processSdpAnswer(message.sdpAnswer);
    }
}

function onExistingParticipants(msg) {
  console.log('onExistingParticipants:', msg);
    var constraints = {
        audio : true,
        video : {
            mandatory : {
                maxWidth : 320,
                maxFrameRate : 15,
                minFrameRate : 15
            }
        }
    };
  console.log(currentUserId + ' registered');

  if (msg.data.length === 0) {
    callId = msg.callId;
  }

  var participant = new Participant(currentUserId);
  participants[currentUserId] = participant;
  var video = participant.getVideoElement();
  participant.rtcPeer = kurentoUtils.WebRtcPeer.startSendOnly(video,
            participant.offerToReceiveVideo.bind(participant), null,
            constraints);
  msg.data.forEach(receiveVideo);
}



function leaveRoom() {
    sendMessage({
        id : 'leaveRoom'
    });

    for ( var key in participants) {
        participants[key].dispose();
    }

    document.getElementById('join').style.display = 'block';
    document.getElementById('room').style.display = 'none';
}

function receiveVideo(sender) {
    var participant = new Participant(sender);
    participants[sender] = participant;
    var video = participant.getVideoElement();
    participant.rtcPeer = kurentoUtils.WebRtcPeer.startRecvOnly(video,
            participant.offerToReceiveVideo.bind(participant));
}

function onParticipantLeft(request) {
    console.log('Participant ' + request.name + ' left');
    var participant = participants[request.name];
    participant.dispose();
    delete participants[request.name];
}


function createCheckBoxes( parentElement, userIds ){
  console.log('createCheckBoxes: currentUserId=', currentUserId)
  var ul = document.createElement('ul');
  parentElement.appendChild(ul);
  for (var i=0; i<userIds.length; i++) {
    var userId = userIds[i];
    if (userId === currentUserId) {
      continue;
    }

    var li = document.createElement('li');
    var label = document.createElement('label');
    var cb = document.createElement('input');
    label.innerHTML = ''+userId;
    cb.type = 'checkbox';
    cb.value = userId;
    cb.id = 'chk_' + userId;
    ul.appendChild(li);
    li.appendChild(label);
    label.appendChild(cb);
  }
}
