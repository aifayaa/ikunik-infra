import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import { getPurchasableProduct } from '../../lib/getPurchasableProduct';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_PURCHASABLE_PRODUCT,
} = process.env;

describe('lib - getPurchasableProduct', () => {
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
    const res = await getPurchasableProduct(
      'crowdaa_app_id',
      'productId',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('array');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
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
