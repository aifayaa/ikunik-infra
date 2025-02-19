/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
// import { expect } from 'chai';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

// import postUserGeneratedContents from '../../lib/postUserGeneratedContents';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

describe.skip('lib - postUserGeneratedContents', () => {
  let spyMongo;
  let stubMongo;
  const responses = [
    { _id: 'appId', settings: {} },
    {
      _id: '_id',
      parentId: 'parentId',
      parentCollection: 'parentCollection',
      rootParentId: 'rootParentId',
      rootParentCollection: 'rootParentCollection',
      userId: 'userId',
      appId: 'crowdaa_app_id',
      type: 'type',
      data: 'data',
      trashed: false,
      createdAt: new Date(),
      modifiedAt: false,
    },
  ];

  before(() => {
    spyMongo = spyMongoMethods(...responses);
    const fakeClient = {
      db: spyMongo.db,
      close: spyMongo.close,
      startSession: spyMongo.startSession,
    };
    stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
  });

  // it('should return a boolean', async () => {
  //   const res = await postUserGeneratedContents(
  //     'crowdaa_app_id',
  //     'parentId',
  //     'parentCollection',
  //     'rootParentId',
  //     'rootParentCollection',
  //     'userId',
  //     'type',
  //     'data'
  //   );
  //   expect(res).to.be.an('object');
  // });

  it('mongo connection done', () => {
    sinon.assert.calledWith(spyMongo.db);
    sinon.assert.called(spyMongo.close);
  });

  it('should be called with the good args', () => {
    sinon.assert.calledWith(spyMongo.collection, COLL_USER_GENERATED_CONTENTS);
    sinon.assert.calledWith(
      spyMongo.insertOne,
      spyMongo.insertOne.getCall(0).args[0]
    );
  });

  after(() => {
    stubMongo.restore();
  });
});
