/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient.ts';
import mongoCollections from '../../../libs/mongoCollections.json';
import editProfile from '../../lib/editProfile';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_USERS } = mongoCollections;

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
    const res = await editProfile('userId', 'appId', { username: 'a' });
    expect(res).to.be.a('boolean');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USERS);
    sinon.assert.calledWith(
      spyMongo.updateOne,
      spyMongo.updateOne.getCall(0).args[0]
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
