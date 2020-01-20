import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import { putArticle } from '../../lib/putArticle';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_PRESS_DRAFTS,
} = process.env;

describe('lib - putArticle', () => {
  let spyMongo;
  let stubMongo;
  const response = {
    articlesId: 'articleId',
    draftId: 'draftId',
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
    const obj = {
      userId: 'userId',
      appId: 'appId',
      articleId: 'articleId',
      categoryId: 'categoryId',
      title: 'title',
      summary: 'summary',
      html: 'html',
      md: 'md',
      pictures: [],
      plainText: '',
    };
    const res = await putArticle(obj);
    expect(res).to.be.a('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_DRAFTS);
    sinon.assert.calledWith(
      spyMongo.findOne,
      spyMongo.findOne.getCall(0).args[0],
      spyMongo.findOne.getCall(0).args[1],
    );
    sinon.assert.calledWith(spyMongo.insertOne, spyMongo.insertOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
