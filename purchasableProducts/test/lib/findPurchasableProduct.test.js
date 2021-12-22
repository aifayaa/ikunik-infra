import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import { findPurchasableProduct } from '../../lib/findPurchasableProduct';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

describe('lib - findPurchasableProduct', () => {
  let spyMongo;
  let stubMongo;
  const response = [];

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await findPurchasableProduct(
      'crowdaa_app_id',
      {
        contentId: 'contentId',
        contentCollection: 'contentCollection',
      },
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('array');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PURCHASABLE_PRODUCT);
    sinon.assert.calledWith(spyMongo.findOne, spyMongo.findOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
