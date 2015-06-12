'use strict';

var logger = require('./logger');
var UserSession = require('./user_session');
var shortid = require('shortid');

// Constructor
function Call(mediaPipeline) {
  // always initialize all instance properties
  this.mediaPipeline = mediaPipeline;
  this.participants = {};
  this.callId = shortid.generate();
  this.callerId = null; // the first caller who initiate this call session

  logger.info('CALL ' + this.callId + ' has been created.');
}

Call.prototype.getName = function () {
  return this.callId;
};

Call.prototype.isEmpty = function () {
  if (Object.keys(this.participants).length === 0) {
    return false;
  }
  return true;
};

Call.prototype.leave = function (userSession) {
  logger.info('PARTICIPANT ' + userSession.getUserName() + ' leaving call ' +
    this.callId);
  this.removeParticipant(userSession.getUserName(), function (user) {
    user.close();
  });
};

Call.prototype.join = function (userId, sendMessageCallback, sessionId, userRegistry) {
  logger.info('CALL ' + this.callId + ': adding participant ' + userId);
  var participant = new UserSession(userId, this, sendMessageCallback,
    sessionId, this.mediaPipeline);

  if (this.callerId === null) {
    this.callerId = userId;
  }

  var self = this;
  participant.createWebRtcEndpoint(function () {
    userRegistry.register(participant);

    self.notifyOtherParticipants(participant);
    self.sendParticipantNames(participant);
    self.participants[userId] = participant;
  });
};

Call.prototype.sendParticipantNames = function (userSession) {
  var otherParticipants = [];
  var userName = userSession.getUserName();
  var name;
  for (name in this.participants) {
    if (name !== userName) {
      otherParticipants.push(name);
    }
  }

  var participantsMessage = {
    id : 'existingParticipants',
    data : otherParticipants,
    callId : this.callId,
    callerId : this.callerId
  };

  logger.info('PARTICIPANT ' + userName + ': sending a list of ' +
    otherParticipants.length + ' participants');
  userSession.sendMessage('existingParticipants', participantsMessage);
};

Call.prototype.notifyOtherParticipants = function (newParticipant) {

  var newParticipantMsg = {};
  newParticipantMsg.id = 'newParticipantArrived';
  newParticipantMsg.name = newParticipant.getUserName();

  logger.info('CALL ' + this.callId +
    ': notifying other participants of new participant ' + newParticipant.getUserName()
  );
  for (var name in this.participants) {
    this.participants[name].sendMessage(newParticipantMsg);
  }
};

Call.prototype.removeParticipant = function (userName, callback) {
  logger.info('CALL ' + this.callId + ': notifying all users that  ' +
    userName + ' is leaving the call');

  var participant = this.participants[userName];

  if (participant) {
    logger.info('Remove from participants list.');
    delete this.participants[userName];
  } else {
    logger.info('Participant not found in this call.');
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

Call.prototype.close = function () {
  logger.info('close call ' + this.callId);
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
module.exports = Call;
