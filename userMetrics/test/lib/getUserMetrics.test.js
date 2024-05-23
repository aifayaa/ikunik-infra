/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient.ts';
import mongoCollections from '../../../libs/mongoCollections.json';

import getUserMetrics from '../../lib/getUserMetrics';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_USER_METRICS } = mongoCollections;

describe('lib - getUserMetrics', () => {
  let spyMongo;
  let stubMongo;
  const response = [];

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await getUserMetrics('crowdaa_app_id', 'userMetricsId');
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('array');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_METRICS);
    sinon.assert.calledWith(
      spyMongo.aggregate,
      spyMongo.aggregate.getCall(0).args[0]
    );
    sinon.assert.called(spyMongo.toArray);
  });

  after(() => {
    stubMongo.restore();
  });
});
