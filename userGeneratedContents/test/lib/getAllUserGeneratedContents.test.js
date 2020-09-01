import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import getAllUserGeneratedContents from '../../lib/getAllUserGeneratedContents';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

describe('lib - getAllUserGeneratedContents', () => {
  let spyMongo;
  let stubMongo;
  const response1 = [];
  const response2 = [{ total: 0 }];

  before(() => {
    spyMongo = spyMongoMethods(response1, response2);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return an object', async () => {
    const res = await getAllUserGeneratedContents(
      'crowdaa_app_id',
      0,
      10,
      'article',
      'userId',
    );
    expect(res).to.deep.eq({ items: [], totalCount: 0 });
    expect(res).to.be.an('object');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_GENERATED_CONTENTS);
    sinon.assert.calledWith(spyMongo.aggregate, spyMongo.aggregate.getCall(0).args[0]);
    sinon.assert.called(spyMongo.toArray);
  });

  after(() => {
    stubMongo.restore();
  });
});
