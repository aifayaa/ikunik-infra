// TODO: these tests need to be updated since facebookSettings loaded from db
//       line which fail will be commented with 'TODO(0): '
//       at least on mongo connection is done in every cases
//       missing stub of lib getFacebookSettings
import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, beforeEach, afterEach, describe, it, after } from 'mocha';
import { expect } from 'chai';

import { getUserByFacebook } from '../../lib/getUserByFacebook';
import * as lib0 from '../../lib/getFacebookAppToken';
import * as lib1 from '../../lib/getFacebookLongLiveToken';
import * as lib2 from '../../lib/getFacebookUserProfile';

import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { MONGO_URL, DB_NAME, COLL_USERS } = process.env;

const lib0Return = 'MyAppToken';
const lib1Return = {
  accessToken: 'myAccessToken',
  expiresAt: 'myExpirationDate',
  fbUserId: 'myFbUserId',
};
const lib2Return = {
  name: 'myUsername',
};
const stubs = [];

describe('lib - getUserByFacebook', () => {
  let spyMongo;
  let stubMongo;
  const response = null;
  const sandbox = sinon.createSandbox();

  const mongoConnectionDone = () => {
    sinon.assert.calledWith(stubMongo, MONGO_URL);
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  };
  const mongoConnectionNotDone = () => {
    sinon.assert.notCalled(stubMongo);
    sinon.assert.notCalled(spyMongo.db);
    sinon.assert.notCalled(spyMongo.close);
  };

  describe('lib errors', () => {
    beforeEach(() => {
      spyMongo = spyMongoMethods(response);
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
        startSession: spyMongo.startSession,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
    });

    afterEach(() => {
      stubMongo.restore();
      sandbox.restore();
    });

    it('should forward throw error if lib 0 throw error', async () => {
      stubs[0] = sandbox.stub(lib0, 'getFacebookAppToken').throws('lib0Error');
      stubs[1] = sandbox
        .stub(lib1, 'getFacebookLongLiveToken')
        .returns(lib1Return);
      stubs[2] = sandbox
        .stub(lib2, 'getFacebookUserProfile')
        .returns(lib2Return);
      let error;
      try {
        await getUserByFacebook('myUserToken');
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
      expect(error.name).to.equal('lib0Error');
      // TODO(0):
      // mongoConnectionNotDone();
    });
    it('should forward throw error if lib 1 throw error', async () => {
      stubs[0] = sandbox.stub(lib0, 'getFacebookAppToken').returns(lib0Return);
      stubs[1] = sandbox
        .stub(lib1, 'getFacebookLongLiveToken')
        .throws('lib1Error');
      stubs[2] = sandbox
        .stub(lib2, 'getFacebookUserProfile')
        .returns(lib2Return);
      let error;
      try {
        await getUserByFacebook('myUserToken');
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
      expect(error.name).to.equal('lib1Error');
      // TODO(0):
      // mongoConnectionNotDone();
    });
    it('should forward throw error if lib 2 throw error', async () => {
      stubs[0] = sandbox.stub(lib0, 'getFacebookAppToken').returns(lib0Return);
      stubs[1] = sandbox
        .stub(lib1, 'getFacebookLongLiveToken')
        .returns(lib1Return);
      stubs[2] = sandbox
        .stub(lib2, 'getFacebookUserProfile')
        .throws('lib2Error');
      let error;
      try {
        await getUserByFacebook('myUserToken');
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
      expect(error.name).to.equal('lib2Error');
      // TODO(0):
      // mongoConnectionNotDone();
    });
  });
  describe('case user exists', () => {
    let resp;
    before(async () => {
      spyMongo = spyMongoMethods({
        _id: 'myUserId',
        services: {
          facebook: {
            id: 'myFbUserId',
          },
        },
      });
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
        startSession: spyMongo.startSession,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      stubs[0] = sandbox.stub(lib0, 'getFacebookAppToken').returns(lib0Return);
      stubs[1] = sandbox
        .stub(lib1, 'getFacebookLongLiveToken')
        .returns(lib1Return);
      stubs[2] = sandbox
        .stub(lib2, 'getFacebookUserProfile')
        .returns(lib2Return);
      resp = await getUserByFacebook('myUserToken');
    });

    after(() => {
      stubMongo.restore();
      sandbox.restore();
    });

    it('should get user in Db', () => {
      sinon.assert.calledWith(spyMongo.collection, COLL_USERS);
      const [args0] = spyMongo.findOne.getCall(1).args;
      expect(args0).to.have.any.keys({ 'services.facebook.id': 'myfbUserId' });
    });

    it('should update user tokens in Db', () => {
      sinon.assert.calledWith(spyMongo.collection, COLL_USERS);
      const [args0, args1] = spyMongo.updateOne.getCall(0).args;
      expect(args0).to.have.any.keys({ _id: 'myUserId' });
      expect(args1).to.deep.includes({
        $set: {
          'services.facebook.accessToken': 'myAccessToken',
          'services.facebook.expiresAt': 'myExpirationDate',
        },
      });
      expect(args1.$addToSet['services.resume.loginTokens']).to.have.any.keys([
        'hashedToken',
        'when',
      ]);
    });

    it('should return userId and authToken', () => {
      expect(resp).to.have.any.keys([
        'userId',
        'authToken',
      ]);
      expect(resp.userId).to.equal('myUserId');
      expect(resp.authToken).to.be.string;
    });
  });

  describe('case user not exists', () => {
    let resp;
    before(async () => {
      spyMongo = spyMongoMethods(null);
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
        startSession: spyMongo.startSession,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      stubs[0] = sandbox.stub(lib0, 'getFacebookAppToken').returns(lib0Return);
      stubs[1] = sandbox
        .stub(lib1, 'getFacebookLongLiveToken')
        .returns(lib1Return);
      stubs[2] = sandbox
        .stub(lib2, 'getFacebookUserProfile')
        .returns(lib2Return);
      resp = await getUserByFacebook('myUserToken');
    });

    after(() => {
      stubMongo.restore();
      sandbox.restore();
    });

    it('should get user in Db', () => {
      sinon.assert.calledWith(spyMongo.collection, COLL_USERS);
      const [args0] = spyMongo.findOne.getCall(1).args;
      expect(args0).to.have.any.keys({ 'services.facebook.id': 'myfbUserId' });
    });

    it('should not update User', () => {
      expect(spyMongo.updateOne.notCalled);
    });

    it('should create user in Db', () => {
      expect(spyMongo.insertOne.calledOnce).to.be.true;
      const [args] = spyMongo.insertOne.getCall(0).args;
      expect(args).to.have.any.keys([
        '_id',
        'createdAt',
        'profile',
        'services',
      ]);
      expect(args).to.deep.includes({
        profile: {
          username: 'myUsername',
          avatar: 'https://graph.facebook.com/myFbUserId/picture',
        },
      });
      expect(args.services.facebook).to.includes({
        accessToken: 'myAccessToken',
        expiresAt: 'myExpirationDate',
        id: 'myFbUserId',
        name: 'myUsername',
      });
      const [{ hashedToken, when }] = args.services.resume.loginTokens;
      expect(hashedToken).to.be.string;
      expect(when).to.be.string;
    });
    it('should return created userId and authToken', () => {
      expect(resp).to.have.any.keys([
        'userId',
        'authToken',
      ]);
      expect(resp.userId).to.be.string;
      expect(resp.authToken).to.be.string;
    });
  });
});
