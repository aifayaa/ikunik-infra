import sinon from 'sinon';
import { before, after, beforeEach, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import { changePassword } from '../../lib/changePassword';

import spyMongoMethods from '../../../libs/test/spyMongoMethods';
import * as sendEmailLib from '../../../libs/email/sendEmail';
import * as libIntl from '../../../libs/intl/intl';

describe('lib - changePassword', () => {
  let spyMongo;
  let stubMongo;
  let stubEmailLib;
  let stubIntl;

  describe('normal password change process', () => {
    const userId = 'someUserId';
    const appId = 'someAppId';
    const email = 'some@email.address';
    const lang = 'en';
    const oldPassword = 'oldPassword';
    const password = 'newPassword';
    const oldPasswordHash = '$2a$10$t1W.Sc6x.tX1Ga6GWHvluuGTGLFzL8Xew663LCy94wMla9FSvcuOe';

    beforeEach(() => {
      spyMongo = spyMongoMethods({
        _id: userId,
        appId,
        emails: [{
          address: email,
        }],
        services: {
          password: {
            bcrypt: oldPasswordHash,
          },
        },
        profile: {
          username: 'Some Username',
        },
      });
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
        startSession: spyMongo.startSession,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      stubEmailLib = sinon.stub(sendEmailLib, 'sendEmailTemplate');
      stubIntl = sinon.stub(libIntl, 'getUserLanguage').returns('en');
    });

    afterEach(() => {
      stubEmailLib.restore();
      stubMongo.restore();
      stubIntl.restore();
    });

    it('should change the user password', async () => {
      await changePassword(userId, oldPassword, password, appId, lang);

      expect(spyMongo.updateOne.args[0][0]).to.nested.include({
        _id: userId,
        appId,
      });
      expect(spyMongo.updateOne.args[0][1]).to.have.nested.property('$set.services\\.resume\\.loginTokens');
      expect(spyMongo.updateOne.args[0][1]).to.have.nested.property('$set.services\\.password\\.bcrypt');
      expect(spyMongo.updateOne.args[0][1].$set['services.password.bcrypt']).to.match(/^\$/);
    });

    it('should send an email to the user', async () => {
      await changePassword(userId, oldPassword, password, appId, lang);

      expect(stubEmailLib.args[0][2]).to.equal(email);
    });
  });

  describe('invalid password change process', () => {
    const userId = 'someUserId';
    const appId = 'someAppId';
    const email = 'some@email.address';
    const lang = 'en';
    const oldPassword = 'oldPassword';
    const password = 'newPassword';
    const badPasswordHash = '$2a$10$t1W.Sc6x';

    before(() => {
      stubEmailLib = sinon.stub(sendEmailLib, 'sendEmailTemplate');
      stubIntl = sinon.stub(libIntl, 'getUserLanguage').returns('en');
    });

    after(() => {
      stubEmailLib.restore();
      stubIntl.restore();
    });

    describe('1/4', () => {
      before(() => {
        spyMongo = spyMongoMethods(null);
        const fakeClient = {
          db: spyMongo.db,
          close: spyMongo.close,
          startSession: spyMongo.startSession,
        };
        stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      });

      after(() => {
        stubMongo.restore();
      });

      it('should fail with user not found', async () => {
        try {
          await changePassword(userId, oldPassword, password, appId, lang);
        } catch (error) {
          expect(error).to.be.an('error').and.to.have.property('message', 'user_not_found');
        }
      });
    });

    describe('2/4', () => {
      before(() => {
        spyMongo = spyMongoMethods({
          emails: [{
            address: false,
          }],
        });
        const fakeClient = {
          db: spyMongo.db,
          close: spyMongo.close,
          startSession: spyMongo.startSession,
        };
        stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      });

      after(() => {
        stubMongo.restore();
      });

      it('should fail with user not found (v2)', async () => {
        try {
          await changePassword(userId, oldPassword, password, appId, lang);
        } catch (error) {
          expect(error).to.be.an('error').and.to.have.property('message', 'user_not_found');
        }
      });
    });

    describe('3/4', () => {
      before(() => {
        spyMongo = spyMongoMethods({
          emails: [{
            address: email,
          }],
          services: {
            password: {
              bcrypt: false,
            },
          },
        });
        const fakeClient = {
          db: spyMongo.db,
          close: spyMongo.close,
          startSession: spyMongo.startSession,
        };
        stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      });

      after(() => {
        stubMongo.restore();
      });

      it('should fail with user not found (v3)', async () => {
        try {
          await changePassword(userId, oldPassword, password, appId, lang);
        } catch (error) {
          expect(error).to.be.an('error').and.to.have.property('message', 'user_not_found');
        }
      });
    });

    describe('4/4', () => {
      before(() => {
        spyMongo = spyMongoMethods({
          emails: [{
            address: email,
          }],
          services: {
            password: {
              bcrypt: badPasswordHash,
            },
          },
        });
        const fakeClient = {
          db: spyMongo.db,
          close: spyMongo.close,
          startSession: spyMongo.startSession,
        };
        stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      });

      after(() => {
        stubMongo.restore();
      });

      it('should fail with incorrect password', async () => {
        try {
          await changePassword(userId, oldPassword, password, appId, lang);
        } catch (error) {
          expect(error).to.be.an('error').and.to.have.property('message', 'incorrect_password');
        }
      });
    });
  });
});
