'use strict';

var async = require('async');
var logger = require('./logger');
var Call = require('./call');
var kurento = require('kurento-client');

var kurentoClient = null;

function getKurentoClient(ws_uri, callback) {
  logger.info('getKurentoClient: ' + ws_uri);

  if (kurentoClient !== null) {
    return callback(null, kurentoClient);
  }

  async.waterfall([
      async.apply(kurento, ws_uri)
    ],
    function (error, _kurentoClient) {
      if (error) {
        var message = 'Could not find media server at address ' + ws_uri;
        logger.info(message);
        return null;
      }
      logger.info(
        'getKurentoClient: global variable kurentoClient initialized');
      kurentoClient = _kurentoClient;
      //return _kurentoClient;
      callback(null, kurentoClient);
    });
  //  return kurentoClient;

  /*
    kurento(ws_uri, function (error, _kurentoClient) {
      if (error) {
        var message = 'Could not find media server at address ' + ws_uri;
        logger.info(message);
        return callback(message + ". Exiting with error " + error);
      }

      logger.info(
        'getKurentoClient: global variable kurentoClient initialized');
      kurentoClient = _kurentoClient;
      callback(null, kurentoClient);
    });*/
}

function CallManager(ws_uri) {
  this.ws_uri = ws_uri;
  this.callsById = {};
}

CallManager.prototype.getCall = function (callId, callback) {
  logger.info('searching for call ' + callId);

  var call = this.callsById[callId];
  if (call) {
    logger.info('Call ' + callId + ' found.');

    if (callback) {
      callback(null, call);
    }
  } else {

    logger.info('Call ' + callId + ' not existent. Create now !');

    var self = this;
    async.waterfall([
      //async.apply( getKurentoClient, this.ws_uri )
      function (callback)  {
        getKurentoClient(self.ws_uri, callback);
        //callback( null, kurentoClient );
      }

    ], function end(error, k) {
      console.log(k);
      if (error) {
        logger.error('createPipeline: error=' + error);
        return;
      }
      kurentoClient.create('MediaPipeline', function (error, pipeline) {
        if (error) {
          logger.error('createPipeline: MediaPipeline: error=' +
            error);
          callback(error);
          return;
        }
        var r = new Call(pipeline);
        logger.info('MediaPipeline for call ' + r.callId +
          ' created: ' + pipeline);
        self.callsById[r.callId] = r;
        callback(null, r);
      });
    });
    //var k = getKurentoClient(this.ws_uri);
    //  console.log('---');console.log(k);
    /*
    var self = this;
    getKurentoClient(this.ws_uri, function (error, kurentoClient) {
      if (error) {
        logger.error('createPipeline: error=' + error);
        return;
      }

      kurentoClient.create('MediaPipeline', function (error, pipeline) {
        if (error) {
          logger.error('createPipeline: MediaPipeline: error=' +
            error);
          return;
        }
        logger.info('MediaPipeline for room ' + roomName +
          ' created: ' + pipeline);
        var r = new Room(roomName, pipeline);
        self.roomsByName[roomName] = r;
        callback(r);
      });
    });*/
  }
};

CallManager.prototype.removeCall = function (call) {
  var callId = call.getId();
  var r = this.callsById[callId];
  if (r) {
    delete this.callsById[callId];
  }
  call.close();
  logger.info('Call ' + callId + ' removed and closed.');
};

CallManager.prototype.getCallIds = function () {
  var calls = [];
  for (var id in this.callsById) {
    calls.push(id);
  }
  return calls;
};

module.exports = CallManager;
