import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import patchUserGeneratedContents from '../../lib/patchUserGeneratedContents';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

describe('lib - patchUserGeneratedContents', () => {
  let spyMongo;
  let stubMongo;
  const response = false;

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
      startSession: spyMongo.startSession,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return a boolean', async () => {
    const res = await patchUserGeneratedContents(
      'crowdaa_app_id',
      'userId',
      'userGeneratedContentsId',
      'data',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('boolean');
  });

  it('mongo connection done', () => {
    sinon.assert.calledWith(stubMongo, MONGO_URL);
    sinon.assert.calledWith(spyMongo.db, DB_NAME);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_GENERATED_CONTENTS);
    sinon.assert.calledWith(spyMongo.updateOne, spyMongo.updateOne.getCall(0).args[0]);
  });

  after(() => {
    stubMongo.restore();
  });
});
