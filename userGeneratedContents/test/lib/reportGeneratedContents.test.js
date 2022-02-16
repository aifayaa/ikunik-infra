import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import reportUserGeneratedContents from '../../lib/reportUserGeneratedContents';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_USER_GENERATED_CONTENTS_REPORTS } = mongoCollections;

describe('lib - reportUserGeneratedContents', () => {
  let spyMongo;
  let stubMongo;
  const response = {
    _id: '_id',
    appId: 'crowdaa_app_id',
    createdAt: new Date(),
    details: 'details',
    reason: 'reason',
    ugcId: 'ugcId',
    userId: 'userId',
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
    const res = await reportUserGeneratedContents(
      'crowdaa_app_id',
      'userId',
      'userGeneratedContentsId',
      'reason',
      'details',
    );
    expect(res).to.be.an('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_GENERATED_CONTENTS_REPORTS);
    sinon.assert.calledWith(spyMongo.insertOne, spyMongo.insertOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
