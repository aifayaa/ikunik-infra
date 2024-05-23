// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { before, describe, it, after } from 'mocha';
// import { expect } from 'chai';
// import MongoClient from '../../../libs/mongoClient.ts';
// import mongoCollections from '../../../libs/mongoCollections.json';

// import { getArticle } from '../../lib/getArticle';
// import spyMongoMethods from '../../../libs/test/spyMongoMethods';

// const { COLL_PRESS_ARTICLES } = mongoCollections;

// describe('lib - getArticle', () => {
//   let spyMongo;
//   let stubMongo;
//   const response = { title: 'articleTitle' };

//   before(() => {
//     spyMongo = spyMongoMethods([response]);
//     const fakeClient = {
//       db: spyMongo.db,
//       close: spyMongo.close,
//     };
//     stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//   });

//   // TODO: FIX TEST (Added lambda exec for counters)
//   it.skip('should return an article', async () => {
//     const res = await getArticle('articleId', 'crowdaa_app_id', {
//       getPictures: false,
//       isServer: false,
//     });
//     expect(res).to.deep.eq(response);
//     expect(res).to.be.a('object');
//   });

//   it.skip('mongo connection done', () => {
//     sinon.assert.calledWith(spyMongo.db);
//     sinon.assert.called(spyMongo.close);
//   });

//   it.skip('should be called with the good args', () => {
//     sinon.assert.calledWith(spyMongo.collection, COLL_PRESS_ARTICLES);
//     sinon.assert.calledWith(
//       spyMongo.aggregate,
//       spyMongo.aggregate.getCall(0).args[0]
//     );
//     sinon.assert.called(spyMongo.toArray);
//   });

//   after(() => {
//     stubMongo.restore();
//   });
// });
