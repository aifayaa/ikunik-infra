import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import { deletePurchasableProduct } from '../../lib/deletePurchasableProduct';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

describe('lib - deletePurchasableProduct', () => {
  let spyMongo;
  let stubMongo;
  const response = true;

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await deletePurchasableProduct(
      'crowdaa_app_id',
      'userId',
      'productId',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('boolean');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PURCHASABLE_PRODUCT);
    sinon.assert.calledWith(spyMongo.deleteOne, spyMongo.deleteOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
