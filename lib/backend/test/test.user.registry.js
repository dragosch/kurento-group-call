
'use strict';

var should = require('should');
var UserRegistry = require('../user_registry.js');
var UserSession = require('../user_session.js');



describe('test user registry:', function () {
 it('getByName should return null if user does not exist', function (done) {
   var userRegistry = new UserRegistry();
   var user = userRegistry.getByName('huhu');
   should.equal(user, null);
   //should(user).not.be.ok;
   // must call done() so that mocha know that we are... done.
   // Useful for async tests.
   done();
 });

 it('getByName should return a user if user exists', function (done) {
   var userRegistry = new UserRegistry();
   var userSession = new UserSession( 'userOne', 'room', null, 'sessionOne' );

   userRegistry.register(userSession);
   var user = userRegistry.getByName('userOne');
   should.exist(user);
   done();
 });

 it('getBySessionId should return null if user does not exist', function (done) {
   var userRegistry = new UserRegistry();
   var user = userRegistry.getBySessionId('huhu');
   should.equal(user, null);
   done();
 });

 it('getBySessionId should return a user if user exists', function (done) {
   var userRegistry = new UserRegistry();
   var userSession = new UserSession( 'userOne', 'room', null, 'sessionOne' );

   userRegistry.register(userSession);
   var user = userRegistry.getBySessionId('sessionOne');
   should.exist(user);
   done();
 });

it('removeBySession should return null if user does not exist', function (done) {
   var userRegistry = new UserRegistry();
   var user = userRegistry.removeBySession('huhu');
   should.equal(user, null);
   done();
 });

 it('removeBySession should return the removed user if user exists', function (done) {
   var userRegistry = new UserRegistry();
   var userSession = new UserSession( 'userOne', 'room', null, 'sessionOne' );

   userRegistry.register(userSession);
   var user = userRegistry.removeBySession('sessionOne');
   should.exist(user);
   done();
 });

 it('after call of removeBySession the user does not exist any more', function (done) {
   var userRegistry = new UserRegistry();
   var userSession = new UserSession( 'userOne', 'room', null, 'sessionOne' );

   userRegistry.register(userSession);
   var user = userRegistry.removeBySession('sessionOne');

   user = userRegistry.getByName('userOne');
   should.equal(user, null);

   user = userRegistry.getBySessionId('sessionOne');
   should.equal(user, null);

   user = userRegistry.removeBySession('userOne');
   should.equal(user, null);

   done();
 });

});