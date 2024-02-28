/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import { patchPurchasableProduct } from '../../lib/patchPurchasableProduct';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

describe('lib - patchPurchasableProduct', () => {
  let spyMongo;
  let stubMongo;
  const response = { matchedCount: undefined, modifiedCount: undefined };

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await patchPurchasableProduct(
      'crowdaa_app_id',
      'userId',
      'productId',
      {
        contents: [],
        options: {
          expiresIn: false,
        },
        price: 'price',
        type: 'type',
      }
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_PURCHASABLE_PRODUCT);
    sinon.assert.calledWith(
      spyMongo.updateOne,
      spyMongo.updateOne.getCall(0).args[0]
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
