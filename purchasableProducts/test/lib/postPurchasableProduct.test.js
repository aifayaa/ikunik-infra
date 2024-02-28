/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import { postPurchasableProduct } from '../../lib/postPurchasableProduct';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_PURCHASABLE_PRODUCT } = mongoCollections;

describe('lib - postPurchasableProduct', () => {
  let spyMongo;
  let stubMongo;
  const response = { productId: '_id' };

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await postPurchasableProduct('crowdaa_app_id', 'userId', {
      _id: '_id',
      contents: [],
      options: {
        expiresIn: false,
      },
      price: 'price',
      type: 'type',
    });
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
      spyMongo.insertOne,
      spyMongo.insertOne.getCall(0).args[0]
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
