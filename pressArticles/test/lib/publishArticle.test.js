import sinon from 'sinon';
import MongoClient from '../../../libs/mongoClient'
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import { publishArticle } from '../../lib/publishArticle';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { MONGO_URL, DB_NAME, COLL_PRESS_ARTICLES, COLL_PRESS_DRAFTS } = process.env;

describe('lib - publishArticle', () => {
  let spyMongo;
  let stubMongo;

  describe('Case article contain pictures', () => {
    const response = { articleId: 'articleId', draftId: 'draftId', pictures: ['pic1', 'pic2'] };
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
      const res = await publishArticle(
        'userId',
        'appId',
        'articleId',
        'draftId',
        'publicationDate',
      );
      expect(res).to.deep.eq({ articleId: 'articleId', draftId: 'draftId' });
      expect(res).to.be.an('object');
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

    it('should findone draft', () => {
      sinon.assert.called(spyMongo.findOne);
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
        spyMongo.updateOne,
        spyMongo.updateOne.getCall(1).args[0],
        spyMongo.updateOne.getCall(1).args[1],
        spyMongo.updateOne.getCall(1).args[2],
      );
      sinon.assert.calledWith(
        spyMongo.updateMany,
        spyMongo.updateMany.getCall(0).args[0],
        spyMongo.updateMany.getCall(0).args[1],
        spyMongo.updateMany.getCall(0).args[2],
      );
    });

    it('should throw an error if no pictures in doc', async () => {
      const res = await publishArticle(
        'userId',
        'appId',
        'articleId',
        'draftId',
        'publicationDate',
      );
      expect(res).to.deep.eq({ articleId: 'articleId', draftId: 'draftId' });
      expect(res).to.be.an('object');
    });

    after(() => {
      stubMongo.restore();
    });
  });

  describe('Case missing picture in article', () => {
    const response = { articleId: 'articleId', draftId: 'draftId', pictures: [] };
    before(() => {
      spyMongo = spyMongoMethods(response);
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
        startSession: spyMongo.startSession,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
    });
    it('should throw an error', async () => {
      let error;
      try {
        await publishArticle('userId', 'appId', 'articleId', 'draftId', 'publicationDate');
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
    });
    after(() => {
      stubMongo.restore();
    });
  });
});
