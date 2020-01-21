import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';

import removeUserGeneratedContents from '../../lib/removeUserGeneratedContents';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

describe('lib - removeUserGeneratedContents', () => {
  let spyMongo;
  let stubMongo;
  const response = false;

  before(() => {
    spyMongo = spyMongoMethods(response);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  it('should return a boolean', async () => {
    const res = await removeUserGeneratedContents(
      'crowdaa_app_id',
      'userId',
      'userGeneratedContentsId',
    );
    expect(res).to.deep.eq(response);
    expect(res).to.be.a('boolean');
  });

  it('mongo connection done', () => {
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
