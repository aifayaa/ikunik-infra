// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { before, after, beforeEach, afterEach, describe, it } from 'mocha';
// import { expect } from 'chai';
// import MongoClient from '../../../libs/mongoClient';

// import { register } from '../../lib/register';

// import spyMongoMethods from '../../../libs/test/spyMongoMethods';
// import * as sendEmailLib from '../../../libs/email/sendEmail';

// describe('lib - register', () => {
//   let spyMongo;
//   let stubMongo;
//   let stubEmailLib;

//   describe('normal register process', () => {
//     const username = 'username';
//     const address = 'mf@crowdaa.com';
//     const password = 'password';
//     const appId = 'appId_does_not_exist';

//     beforeEach(() => {
//       spyMongo = spyMongoMethods({ _id: 0 }, null, [], [], [], []);
//       const fakeClient = {
//         db: spyMongo.db,
//         close: spyMongo.close,
//         startSession: spyMongo.startSession,
//       };
//       stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//       stubEmailLib = sinon.stub(sendEmailLib, 'sendEmailTemplate');
//     });

//     afterEach(() => {
//       stubEmailLib.restore();
//       stubMongo.restore();
//     });

//     // TODO: FIX TEST
//     it.skip('should register a new user', async () => {
//       await register(address, username, password, appId);

//       expect(spyMongo.insertOne.args[0][0]).to.nested.include({
//         username,
//         'emails[0].address': address,
//         'emails[0].verified': false,
//         appId,
//         'profile.username': username,
//       });
//     });

//     // TODO: Disabled since we are not sending an email anymore. Enable it back later!
//     it.skip('should send an email to the user', async () => {
//       await register(address, username, password, appId);

//       expect(stubEmailLib.args[0][2]).to.equal(address);
//     });
//   });

//   describe('invalid register process', () => {
//     const username = 'username';
//     const address = 'mf@crowdaa.com';
//     const password = 'password';
//     const appId = 'app_id';

//     before(() => {
//       stubEmailLib = sinon.stub(sendEmailLib, 'sendEmailTemplate');
//     });

//     after(() => {
//       stubEmailLib.restore();
//     });

//     it('should fail with bad app id', async () => {
//       spyMongo = spyMongoMethods(null);
//       const fakeClient = {
//         db: spyMongo.db,
//         close: spyMongo.close,
//         startSession: spyMongo.startSession,
//       };
//       stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);

//       try {
//         await register(address, username, password, appId);
//       } catch (error) {
//         expect(error)
//           .to.be.an('error')
//           .and.to.have.property('message', 'app_not_found');
//       }

//       stubMongo.restore();
//     });

//     it('should fail with duplicate username or email', async () => {
//       spyMongo = spyMongoMethods(
//         { _id: 0 },
//         null,
//         [],
//         [],
//         [{ _id: 0 }, { _id: 1 }],
//         []
//       );
//       const fakeClient = {
//         db: spyMongo.db,
//         close: spyMongo.close,
//         startSession: spyMongo.startSession,
//       };
//       stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);

//       try {
//         await register(address, username, password, appId);
//       } catch (error) {
//         expect(error).to.be.an('error');
//         expect(error.message).to.be.oneOf([
//           'username_already_exists',
//           'email_already_exists',
//         ]);
//       }

//       stubMongo.restore();
//     });
//   });
// });
