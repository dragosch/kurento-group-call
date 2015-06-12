'use strict';

var logger = require('./logger');

function UserSession(userName, call, sendMessageCallback, sessionId, mediaPipeline) {
  this.userName = userName;
  this.call = call;
  this.sendMessageCallback = sendMessageCallback;
  this.sessionId = sessionId;
  this.mediaPipeline = mediaPipeline;
  this.outgoingMedia = null;
  this.incomingMedia = {};
}

UserSession.prototype.createWebRtcEndpoint = function (callback) {
  var self = this;
  if (this.mediaPipeline) {
    this.mediaPipeline.create('WebRtcEndpoint', function (error, webRtc) {

      logger.info('create WebRtcEndpoint for ' + self.userName);
      if (error) {
        logger.error('failed to create WebRtcEndpoint for user ' + self.userName +
          ', call ' + self.call.callId);
        return;
      }

      self.outgoingMedia = webRtc;
      logger.info('WebRtcEndpoint for user ' + self.userName + ', call ' +
        self.call.callId + ' created.');
      callback();
    });
  }
};

UserSession.prototype.getOutgoingWebRtcPeer = function () {
  return this.outgoingMedia;
};

UserSession.prototype.getUserName = function () {
  return this.userName;
};

UserSession.prototype.getCallId = function () {
  return this.call.callId;
};

UserSession.prototype.getSessionId = function () {
  return this.sessionId;
};

function addMidsForFirefox(sdpOffer, sdpAnswer) {
  var sdpOfferLines = sdpOffer.split('\r\n');

  var bundleLine = '';
  var audioMid = '';
  var videoMid = '';
  var nextMid = '';

  for (var i = 0; i < sdpOfferLines.length; ++i) {
    if (sdpOfferLines[i].indexOf('a=group:BUNDLE') === 0) {
      bundleLine = sdpOfferLines[i];
    } else if (sdpOfferLines[i].indexOf('m=') === 0) {
      nextMid = sdpOfferLines[i].split(' ')[0];
    } else if (sdpOfferLines[i].indexOf('a=mid') === 0) {
      if (nextMid === 'm=audio') {
        audioMid = sdpOfferLines[i];
      } else if (nextMid === 'm=video') {
        videoMid = sdpOfferLines[i];
      }
    }
  }

  return sdpAnswer.replace(/a=group:BUNDLE.*/, bundleLine)
    .replace(/a=mid:audio/, audioMid)
    .replace(/a=mid:video/, videoMid);
}

UserSession.prototype.receiveVideoFrom = function (sender, sdpOffer) {
  var senderName = sender.getUserName();
  logger.info('USER ' + this.userName + ': connecting with ' + senderName +
    ' in call ' + this.call.callId);
  logger.info('USER ' + this.userName + ': SdpOffer for ' + senderName +
    ' is ..'); // + sdpOffer );

  var self = this;
  this.getEndpointForUser(sender, function (webRtc, error) {
    if (error) {
      logger.error('ERROR: ' + error);
      return;
    }
    //console.log(webRtc);
    webRtc.processOffer(sdpOffer, function (error, sdpAnswer) {
      logger.info('processOffer');
      if (error) {
        logger.error('ERROR: ' + error);
        return;
      }

      //console.log(sdpAnswer)
      var params = {
        id: 'receiveVideoAnswer',
        name: sender.getUserName(),
        sdpAnswer: addMidsForFirefox(sdpOffer, sdpAnswer),
        callerId: self.call.callerId
      };

      //logger.info('USER ' + self.userName + ': SdpAnswer for ' + senderName + ' is ' + sdpAnswer );
      logger.info('USER ' + self.userName + ': SdpAnswer for ' +
        senderName + '...');
      self.sendMessage(params);
    });
  });
};

UserSession.prototype.getEndpointForUser = function (senderSession, callback) {

  var senderName = senderSession.getUserName();

  if (senderName === this.userName) {
    logger.info('PARTICIPANT ' + this.userName + ': configuring loopback');
    callback(this.outgoingMedia);
    return;
  }

  logger.info('PARTICIPANT ' + this.userName + ': receiving video from ' +
    senderName);

  var incoming = this.incomingMedia[senderName];
  if (incoming === undefined) {
    this.createNewEndpointForUser(senderSession, callback);
  } else {
    logger.info('PARTICIPANT ' + this.userName +
      ': using existing endpoint for ' + senderName);
    //console.log(incoming);
    callback(incoming);
  }
};

UserSession.prototype.createNewEndpointForUser = function (senderSession,
  callback) {
  var senderName = senderSession.getUserName();
  logger.info('PARTICIPANT ' + this.userName +
    ': creating new endpoint for ' + senderName);
  var self = this;
  this.mediaPipeline.create('WebRtcEndpoint', function (error, webRtc) {
    logger.info('create WebRtcEndpoint');
    if (error) {
      logger.error('failed to create WebRtcEndpoint for user ' + self.userName +
        ', call ' + self.call.callId);
      return;
    }

    self.incomingMedia[senderName] = webRtc;
    logger.info('PARTICIPANT ' + self.userName +
      ': obtained endpoint for ' + senderName);
    senderSession.getOutgoingWebRtcPeer().connect(webRtc, function (
      error) {
      if (error) {
        //TODO      pipeline.release();
        logger.info(
          'createPipeline: MediaPipeline: WebRtcEndpoint: WebRtcEndpoint: connect: error=' +
          error);
        //return callback(error);
        callback(null, error);
        return;
      }
      callback(webRtc);
      return;
    });
  });
};

UserSession.prototype.cancelVideoFrom = function (senderName) {
  logger.info('PARTICIPANT ' + this.userName +
    ': canceling video reception from ' + senderName);

  var incoming = this.incomingMedia[senderName];
  if (incoming) {
    delete this.incomingMedia[senderName];
  }

  logger.info('PARTICIPANT ' + this.userName + ': removing endpoint for ' +
    senderName);
  // console.log(incoming);

  var self = this;
  incoming.release(function (error) {
    self.logEndpointRelease(error, senderName);
  });
};

/**
 * Function does logging if release of one endpoint is successfull or not.
 */
UserSession.prototype.logEndpointRelease = function (error, participantName) {

  if (error !== null) {
    if (participantName) {
      logger.error('PARTICIPANT ' + this.userName +
        ': Could not release incoming EndPoint for ' + participantName +
        ':' + error);
    } else {
      logger.error('PARTICIPANT ' + this.userName +
        ': Could not release outgoing EndPoint: ' + error);
    }
  } else {
    if (participantName) {
      logger.info('PARTICIPANT ' + this.userName +
        ': Released successfully incoming endpoint for ' + participantName);
    } else {
      logger.error('PARTICIPANT ' + this.userName +
        ': Released successfully outgoing EndPoint.');
    }
  }
};

UserSession.prototype.close = function () {
  logger.info('PARTICIPANT ' + this.userName + ': Releasing resources');

  var self = this;
  for (var remoteParticipantName in this.incomingMedia) {
    logger.info('PARTICIPANT ' + remoteParticipantName +
      ': Released incoming EP for ' + this.userName);

    var ep = this.incomingMedia[remoteParticipantName];

    ep.release(function (error) {
      self.logEndpointRelease(error, remoteParticipantName);
    });
  }

  if (this.outgoingMedia !== null) {
    this.outgoingMedia.release(function (error) {
      self.logEndpointRelease(error);
      self.outgoingMedia = null;
    });
  }
};

UserSession.prototype.sendMessage = function () {
  var messageName = 'message';
  var message;
  if (arguments.length == 1) {
    message = arguments[0];
  }
  else
  if (arguments.length == 2) {
    messageName = arguments[0];
    message = arguments[1];
  }
  else {
    console.log('ERROR: invalid number of arguments.');
    return;
  }

  logger.info('USER ' + this.userName + ': Sending message ' + messageName);
  this.sendMessageCallback(messageName, message);

  // TODO errorhandling send failed
  //  logger.info(
  //    'TODO -----------------ROOM {}: The users {} could not be notified that {} left the room'
  //  );

};

module.exports = UserSession;
