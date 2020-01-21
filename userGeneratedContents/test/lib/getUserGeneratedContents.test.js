import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import getUserGeneratedContents from '../../lib/getUserGeneratedContents';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

describe('lib - getUserGeneratedContents', () => {
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
    const res = await getUserGeneratedContents(
      'crowdaa_app_id',
      'userGeneratedContentsId',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('array');
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
