import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import { postArticle } from '../../lib/postArticle';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_ARTICLES,
} = process.env;

describe('lib - postArticle', () => {
  let spyMongo;
  let stubMongo;
  const response = null;

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
      startSession: spyMongo.startSession,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const obj = {
      userId: 'userId',
      appId: 'appId',
      categoryId: 'categoryId',
      title: 'title',
      summary: 'summary',
      html: 'html',
      md: 'md',
      xml: 'xml',
      pictures: ['pictures'],
      plainText: '',
    };
    const res = await postArticle(obj);
    expect(res).to.be.a('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(stubMongo, MONGO_URL);
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.startSession);
    sinon.assert.called(spyMongo.startTransaction);
    sinon.assert.called(spyMongo.commitTransaction);
    sinon.assert.called(spyMongo.endSession);
    sinon.assert.called(spyMongo.close);
  });

  it('should insert article', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_ARTICLES);
    sinon.assert.calledWith(
      spyMongo.insertOne,
      spyMongo.insertOne.getCall(0).args[0],
      spyMongo.insertOne.getCall(0).args[1],
    );
  });

  it('should insert draft', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_DRAFTS);
    sinon.assert.calledWith(
      spyMongo.insertOne,
      spyMongo.insertOne.getCall(1).args[0],
      spyMongo.insertOne.getCall(1).args[1],
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
