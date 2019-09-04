import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import { getArticles } from '../../lib/getArticles';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_ARTICLES,
} = process.env;

describe('lib - getArticles', () => {
  let spyMongo;
  let stubMongo;
  const response = { articles: [], total: 0 };

  before(() => {
    spyMongo = spyMongoMethods([response]);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await getArticles(
      'A_crowdaa_cat',
      0,
      10,
      'crowdaa_app_id',
      { getPictures: true },
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('object');
    expect(res.articles).to.be.a('array');
    expect(res.total).to.be.a('number');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(stubMongo, MONGO_URL);
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_ARTICLES);
    sinon.assert.calledWith(spyMongo.aggregate, spyMongo.aggregate.getCall(0).args[0]);
    sinon.assert.called(spyMongo.toArray);
  });

  after(() => {
    stubMongo.restore();
  });
});
