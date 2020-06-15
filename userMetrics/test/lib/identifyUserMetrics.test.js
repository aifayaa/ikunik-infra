import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import identifyUserMetrics from '../../lib/identifyUserMetrics';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  COLL_PUSH_NOTIFICATIONS,
  COLL_USER_METRICS,
  DB_NAME,
} = process.env;

describe('lib - identifyUserMetrics', () => {
  let spyMongo;
  let stubMongo;
  const response = {
    pushNotificationsResults: true,
    userMetricsResults: true,
  };

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await identifyUserMetrics(
      'crowdaa_app_id',
      'userId',
      'deviceId',
    );
    expect(res).to.deep.eq(response);
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_METRICS);
    sinon.assert.calledWith(spyMongo.collection, COLL_PUSH_NOTIFICATIONS);
    sinon.assert.calledWith(spyMongo.updateMany, spyMongo.updateMany.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
