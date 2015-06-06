/*
var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/debug.log', json: false })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/exceptions.log', json: false })
  ],
  exitOnError: false
});
*/

'use strict';

function Logger() {}

Logger.prototype.info = function (s) {
  console.log(s);
};
Logger.prototype.error = function (s) {
  console.log(s);
};

var logger = new Logger();

module.exports = logger;
