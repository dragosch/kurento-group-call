'use strict';

var logger = require('./logger');
var UserSession = require('./user_session');

// Constructor
function Room(roomName, mediaPipeline) {
  // always initialize all instance properties
  this.roomName = roomName;
  this.mediaPipeline = mediaPipeline;
  this.participants = {};

  logger.info('ROOM ' + roomName + ' has been created.');
}

Room.prototype.getName = function () {
  return this.roomName;
};

Room.prototype.isEmpty = function () {
  if (Object.keys(this.participants).length === 0) {
    return false;
  }
  return true;
};

Room.prototype.leave = function (userSession) {
  logger.info('PARTICIPANT ' + userSession.getUserName() + ' leaving room ' +
    this.roomName);
  this.removeParticipant(userSession.getUserName(), function (user) {
    user.close();
  });
};

Room.prototype.join = function (userName, wsSession, sessionId, userRegistry) {
  logger.info('ROOM ' + this.roomName + ': adding participant ' + userName);
  var participant = new UserSession(userName, this.roomName, wsSession,
    sessionId, this.mediaPipeline);

  var self = this;
  participant.createWebRtcEndpoint(function () {
    userRegistry.register(participant);

    self.notifyOtherParticipants(participant);
    self.sendParticipantNames(participant);
    self.participants[userName] = participant;
  });
};

Room.prototype.sendParticipantNames = function (userSession) {
  var otherParticipants = [];
  var userName = userSession.getUserName();
  var name;
  for (name in this.participants) {
    if (name !== userName) {
      otherParticipants.push(name);
    }
  }

  var participantsMessage = {};
  participantsMessage.id = 'existingParticipants';
  participantsMessage.data = otherParticipants;

  logger.info('PARTICIPANT ' + userName + ': sending a list of ' +
    otherParticipants.length + ' participants');
  userSession.sendMessage(participantsMessage);
};

Room.prototype.notifyOtherParticipants = function (newParticipant) {

  var newParticipantMsg = {};
  newParticipantMsg.id = 'newParticipantArrived';
  newParticipantMsg.name = newParticipant.getUserName();

  logger.info('ROOM ' + this.roomName +
    ': notifying other participants of new participant ' + newParticipant.getUserName()
  );
  for (var name in this.participants) {
    this.participants[name].sendMessage(newParticipantMsg);
  }
};

Room.prototype.removeParticipant = function (userName, callback) {
  logger.info('ROOM ' + this.roomName + ': notifying all users that  ' +
    userName + ' is leaving the room');

  var participant = this.participants[userName];

  if (participant) {
    logger.info('Remove from participants list.');
    delete this.participants[userName];
  } else {
    logger.info('Participant not found in this room.');
    return;
  }

  var participantLeftMsg = {};
  participantLeftMsg.id = 'participantLeft';
  participantLeftMsg.name = userName;

  for (var name in this.participants) {
    if (name !== userName) {
      logger.info('Notifying user ' + name);
      this.participants[name].cancelVideoFrom(userName);
      this.participants[name].sendMessage(participantLeftMsg);
    }
  }

  callback(participant);
};

Room.prototype.close = function () {
  logger.info('close room ' + this.roomName);
  for (var name in this.participants) {
    this.participants[name].close();
    delete this.participants[name];
  }

  this.mediaPipeline.release(function (error) {
    logger.info('release mediapipeline...');
    if (error) {
      logger.error('failed to release mediapipeline: ' + error);
    }
  });
};

// export the class
module.exports = Room;
