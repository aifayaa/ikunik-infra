import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import postUserMetrics from '../../lib/postUserMetrics';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_USER_METRICS,
} = process.env;

describe('lib - postUserMetrics', () => {
  let spyMongo;
  let stubMongo;
  const response = {
    _id: '_id',
    appId: 'crowdaa_app_id',
    userId: 'userId',
    type: 'type',
    contentId: 'contentId',
    contentCollection: 'contentCollection',
    data: 'data',
    trashed: false,
    createdAt: new Date(),
    modifiedAt: false,
  };

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
      startSession: spyMongo.startSession,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return a boolean', async () => {
    const res = await postUserMetrics(
      'crowdaa_app_id',
      'userId',
      'type',
      'contentId',
      'contentCollection',
      'data',
    );
    expect(res).to.be.a('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_METRICS);
    sinon.assert.calledWith(spyMongo.insertOne, spyMongo.insertOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
