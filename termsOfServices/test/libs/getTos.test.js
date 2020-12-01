import sinon from 'sinon';
import { before, describe, it, after, afterEach, beforeEach } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import { getTos } from '../../lib/getTos';
import tosFields from '../../tosFields.json';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { public: projection } = tosFields;

const { DB_NAME, COLL_TOS } = process.env;

describe('lib - getTos', () => {
  let spyMongo;
  let stubMongo;
  const response = [{ _id: 'tosId' }];
  const sort = { createdAt: -1 };

  describe('Check mongo request parameters', () => {
    beforeEach(() => {
      spyMongo = spyMongoMethods(response);
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
    });

    it('should call mongo.find with appId and no _id', async () => {
      await getTos('crowdaa_app_id', undefined);
      sinon.assert.calledWith(spyMongo.collection, COLL_TOS);
      const findArgs = spyMongo.find.getCall(0).args;
      expect(findArgs[0]).to.eql({ appIds: 'crowdaa_app_id' });
      expect(findArgs[1]).to.eql({ projection, sort });
    });
    it('should call mongo.find with appId and _id', async () => {
      await getTos('crowdaa_app_id', 'tosId');
      sinon.assert.calledWith(spyMongo.collection, COLL_TOS);
      const findArgs = spyMongo.find.getCall(0).args;
      expect(findArgs[0]).to.eql({
        appIds: 'crowdaa_app_id',
        _id: 'tosId',
      });
      expect(findArgs[1]).to.eql({ projection, sort });
    });
    afterEach(() => {
      stubMongo.restore();
    });
  });

  describe('global check', () => {
    before(() => {
      spyMongo = spyMongoMethods(response);
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
    });

    it('should return an article', async () => {
      const res = await getTos('crowdaa_app_id', 'tosId');
      expect(res).to.deep.eq(response);
    });

    it('mongo connection done', () => {
      sinon.assert.calledWith(spyMongo.db, DB_NAME);
      sinon.assert.called(spyMongo.close);
    });

    after(() => {
      stubMongo.restore();
    });
  });
});
