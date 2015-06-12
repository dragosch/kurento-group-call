'use strict';

var logger = require('./logger');

/*
 * Map of users registered in the system.
 */
function UserRegistry() {
  this.usersByName = {};
  this.usersBySessionId = {};
  this.sockets = {};
}

UserRegistry.prototype.addSocket = function (socket) {
  this.sockets[socket.id] = socket;
};

UserRegistry.prototype.register = function (userSession) {
  var userName = userSession.getUserName();
  logger.info('register user ' + userName);

  this.usersByName[userName] = userSession;
  this.usersBySessionId[userSession.getSessionId()] = userSession;
};

UserRegistry.prototype.getByName = function (userName) {
  return this.usersByName[userName];
};

UserRegistry.prototype.getBySessionId = function (sessionId) {
  return this.usersBySessionId[sessionId];
};

UserRegistry.prototype.removeBySession = function (sessionId) {
  var user = this.getBySessionId(sessionId);
  if (user) {
    delete this.usersByName[user.getUserName()];
    delete this.usersBySessionId[sessionId];
    return user;
  }
};

module.exports = UserRegistry;
