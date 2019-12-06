import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import editProfile from '../../lib/editProfile';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  COLL_USERS,
  DB_NAME,
  MONGO_URL,
} = process.env;

describe('lib - editProfile', () => {
  let spyMongo;
  let stubMongo;
  const response = true;

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await editProfile(
      'userId',
      'appId',
      { username: 'a' },
    );
    expect(res).to.be.a('boolean');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(stubMongo, MONGO_URL);
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USERS);
    sinon.assert.calledWith(spyMongo.updateOne, spyMongo.updateOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
