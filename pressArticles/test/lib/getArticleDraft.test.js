import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import { getArticleDraft } from '../../lib/getArticleDraft';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_DRAFTS,
} = process.env;

describe('lib - getArticleDraft', () => {
  let spyMongo;
  let stubMongo;
  const response = { title: 'articleTitle' };

  before(() => {
    spyMongo = spyMongoMethods([response]);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an article', async () => {
    const res = await getArticleDraft(
      'articleId',
      'crowdaa_app_id',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(stubMongo, MONGO_URL);
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_DRAFTS);
    sinon.assert.calledWith(spyMongo.aggregate, spyMongo.aggregate.getCall(0).args[0]);
    sinon.assert.called(spyMongo.toArray);
  });

  after(() => {
    stubMongo.restore();
  });
});
