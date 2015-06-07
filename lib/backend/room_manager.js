'use strict';

var async = require('async');
var logger = require('./logger');
var Room = require('./room');
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

function RoomManager(ws_uri) {
  this.ws_uri = ws_uri;
  this.roomsByName = {};
}

RoomManager.prototype.getRoom = function (roomName, callback) {
  logger.info('searching for room ' + roomName);

  var room = this.roomsByName[roomName];
  if (room) {
    logger.info('Room ' + roomName + ' found.');

    if (callback) {
      callback(null, room);
    }
  } else {

    logger.info('Room ' + roomName + ' not existent. Create now !');

    var self = this;
    async.waterfall([
      //async.apply( getKurentoClient, this.ws_uri )
      function (callback)  {
        getKurentoClient(self.ws_uri, callback);
        //callback( null, kurentoClient );
      }

    ], function end(error, k) {
      console.log('---');
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
        logger.info('MediaPipeline for room ' + roomName +
          ' created: ' + pipeline);
        var r = new Room(roomName, pipeline);
        self.roomsByName[roomName] = r;
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

RoomManager.prototype.removeRoom = function (room) {
  var roomName = room.getName();
  var r = this.roomsByName[roomName];
  if (r) {
    delete this.roomsByName[roomName];
  }
  room.close();
  logger.info('Room ' + roomName + ' removed and closed.');
};

RoomManager.prototype.getRoomIds = function () {
  var rooms = [];
  for (var id in this.roomsByName) {
    rooms.push(id);
  }
  return rooms;
};

module.exports = RoomManager;
