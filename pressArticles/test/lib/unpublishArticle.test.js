import sinon from 'sinon';
import MongoClient from '../../../libs/mongoClient'
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import { unpublishArticle } from '../../lib/unpublishArticle';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_DRAFTS,
} = process.env;

describe('lib - unpublishArticle', () => {
  let spyMongo;
  let stubMongo;
  const response = { articleId: 'articleId' };

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
      startSession: spyMongo.startSession,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return articleId', async () => {
    const res = await unpublishArticle(
      'userID',
      'crowdaa_app_id',
      'articleId',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('object');
    expect(res.articleId).to.be.a('string');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.startSession);
    sinon.assert.called(spyMongo.startTransaction);
    sinon.assert.called(spyMongo.commitTransaction);
    sinon.assert.called(spyMongo.endSession);
    sinon.assert.called(spyMongo.close);
  });

  it('should update article', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_ARTICLES);
    sinon.assert.calledWith(
      spyMongo.updateOne,
      spyMongo.updateOne.getCall(0).args[0],
      spyMongo.updateOne.getCall(0).args[1],
      spyMongo.updateOne.getCall(0).args[2],
    );
  });

  it('should update drafts', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_DRAFTS);
    sinon.assert.calledWith(
      spyMongo.updateMany,
      spyMongo.updateMany.getCall(0).args[0],
      spyMongo.updateMany.getCall(0).args[1],
      spyMongo.updateMany.getCall(0).args[2],
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
