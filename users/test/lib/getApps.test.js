/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import * as getAppsLib from '../../lib/getApps';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_USERS } = mongoCollections;

describe('lib - getApps', () => {
  let spyMongo;
  let stubMongo;
  const appsStub = [
    {
      _id: 'crowdaa_app_id',
      name: 'crowdaa',
    },
    {
      _id: 'lequotidien_app_id',
      name: 'leQuotidien',
    },
    {
      _id: 'd2ec9549-24b8-4ada-8656-95f56c198569',
      name: 'dev-TEST2',
    },
    {
      _id: '8f55021e-30d6-48e5-83da-d880171affe4',
      name: 'dev-TEST3',
    },
  ];

  before(() => {
    spyMongo = spyMongoMethods(null, appsStub);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an array', async () => {
    const res = await getAppsLib.default('userId');
    expect(res).to.be.an('array');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USERS);
    sinon.assert.called(spyMongo.aggregate);
  });

  after(() => {
    stubMongo.restore();
  });
});
