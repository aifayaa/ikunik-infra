import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import { getArticles } from '../../lib/getArticles';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_PRESS_ARTICLES } = mongoCollections;

describe('lib - getArticles', () => {
  let spyMongo;
  let stubMongo;
  const dbResponse = [];
  const expectedResponse = { articles: [], total: 0 };

  before(() => {
    spyMongo = spyMongoMethods(dbResponse);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  // TODO: FIX TEST
  it.skip('should return an object', async () => {
    const res = await getArticles(
      'A_crowdaa_cat',
      0,
      10,
      'crowdaa_app_id',
      { getPictures: true },
    );
    expect(res).to.deep.eq(expectedResponse);
    expect(res).to.be.a('object');
    expect(res.articles).to.be.a('array');
    expect(res.total).to.be.a('number');
  });

  // TODO: FIX TEST (This it() fails if the first one is not executed, fix it!)
  it.skip('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  // TODO: FIX TEST (This it() fails if the first one is not executed, fix it!)
  it.skip('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_ARTICLES);
    sinon.assert.calledWith(spyMongo.aggregate, spyMongo.aggregate.getCall(0).args[0]);
    sinon.assert.called(spyMongo.toArray);
  });

  after(() => {
    stubMongo.restore();
  });
});
