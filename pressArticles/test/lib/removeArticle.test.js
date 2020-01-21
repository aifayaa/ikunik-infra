import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import { removeArticle } from '../../lib/removeArticle';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

describe('lib - removeArticle', () => {
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
    const res = await removeArticle(
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

  it('should delete article', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_ARTICLES);
    sinon.assert.calledWith(
      spyMongo.deleteOne,
      spyMongo.deleteOne.getCall(0).args[0],
      spyMongo.deleteOne.getCall(0).args[1],
    );
  });

  it('should delete draft', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_DRAFTS);
    sinon.assert.calledWith(
      spyMongo.deleteMany,
      spyMongo.deleteMany.getCall(0).args[0],
      spyMongo.deleteMany.getCall(0).args[1],
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
