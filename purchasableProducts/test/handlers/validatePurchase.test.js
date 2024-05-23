// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after } from 'mocha';
// import { expect } from 'chai';
// import iap from 'in-app-purchase';
// import handler from '../../handlers/validatePurchase';
// import MongoClient from '../../../libs/mongoClient.ts';
// import mongoCollections from '../../../libs/mongoCollections.json';
// import spyMongoMethods from '../../../libs/test/spyMongoMethods';
// import * as addBalanceLib from '../../../userBalances/lib/addBalance';
// import articlePrices from '../../../pressArticles/articlePrices.json';

// const { COLL_APPS } = mongoCollections;

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handlers - validatePurchase', () => {
//   const productId = 'com.crowdaa.yui.www.article_05';

//   let stubLibAddBalance;
//   let spyMongo;
//   let stubMongo;

//   const mongoResponse = {
//     builds: { android: { googleApiData: 'googleApiData' } },
//     settings: {
//       iap: {
//         appleSecret: 'appleSecret',
//         googleLicenceKey: 'googleLicenceKey',
//       },
//     },
//   };

//   const baseEvent = {
//     requestContext: {
//       authorizer: {
//         appId: 'crowdaa_app_id',
//         principalId: 'userId',
//       },
//     },
//     queryStringParameters: {
//       deviceId: 'deviceId',
//     },
//     body: JSON.stringify({ transaction: {} }),
//   };

//   const appleEvent = {
//     ...baseEvent,
//     body: JSON.stringify({
//       transaction: {
//         appStoreReceipt: 'appStoreReceipt',
//         type: 'ios-appstore',
//       },
//     }),
//   };

//   const googleEvent = {
//     ...baseEvent,
//     body: JSON.stringify({
//       transaction: {
//         receipt: JSON.stringify({
//           id: 'GPA.3317-1712-4584-41312',
//           purchaseToken: 'purchaseToken',
//           signature: 'signature',
//           type: 'android-playstore',
//         }),
//       },
//     }),
//   };

//   const sandbox = sinon.createSandbox();

//   describe('database', () => {
//     before(() => {
//       spyMongo = spyMongoMethods(undefined);
//       const fakeClient = {
//         db: spyMongo.db,
//         close: spyMongo.close,
//       };
//       stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//     });

//     it('app_not_found', async () => {
//       const response = await handler(baseEvent);
//       const { message } = JSON.parse(response.body);
//       expect(response.statusCode).to.equal(500);
//       expect(message).to.equal('app_not_found');
//     });

//     it('mongo connection done', () => {
//       sinon.assert.calledWith(spyMongo.db);
//       sinon.assert.called(spyMongo.close);
//     });

//     it('should be called with the good args', () => {
//       sinon.assert.calledWith(spyMongo.collection, COLL_APPS);
//       sinon.assert.calledWith(
//         spyMongo.findOne,
//         spyMongo.findOne.getCall(0).args[0]
//       );
//     });

//     after(() => {
//       stubMongo.restore();
//       sandbox.restore();
//     });
//   });

//   describe('missing_arguments', () => {
//     describe('missing receipt google, receipt apple', () => {
//       before(() => {
//         spyMongo = spyMongoMethods(mongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//       });

//       it('test', async () => {
//         const response = await handler(baseEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(500);
//         expect(message).to.equal('missing_arguments');
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });

//     describe('missing receipt google, password apple', () => {
//       before(() => {
//         const testMongoResponse = JSON.parse(JSON.stringify(mongoResponse));
//         delete testMongoResponse.settings.iap.appleSecret;
//         spyMongo = spyMongoMethods(testMongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//       });

//       it('test', async () => {
//         const testEvent = JSON.parse(JSON.stringify(appleEvent));
//         const body = JSON.parse(testEvent.body);
//         delete body.transaction.receipt;
//         testEvent.body = JSON.stringify(body);
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(500);
//         expect(message).to.equal('missing_arguments');
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });

//     describe('missing receipt apple, google api data', () => {
//       before(() => {
//         const testMongoResponse = JSON.parse(JSON.stringify(mongoResponse));
//         delete testMongoResponse.builds.android.googleApiData;
//         spyMongo = spyMongoMethods(testMongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//       });

//       it('test', async () => {
//         const testEvent = JSON.parse(JSON.stringify(googleEvent));
//         const body = JSON.parse(testEvent.body);
//         delete body.transaction.appStoreReceipt;
//         testEvent.body = JSON.stringify(body);
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(500);
//         expect(message).to.equal('missing_arguments');
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });

//     describe('missing receipt apple, google licence key', () => {
//       before(() => {
//         const testMongoResponse = JSON.parse(JSON.stringify(mongoResponse));
//         delete testMongoResponse.settings.iap.googleLicenceKey;
//         spyMongo = spyMongoMethods(testMongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//       });

//       it('test', async () => {
//         const testEvent = JSON.parse(JSON.stringify(googleEvent));
//         const body = JSON.parse(testEvent.body);
//         delete body.transaction.appStoreReceipt;
//         testEvent.body = JSON.stringify(body);
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(500);
//         expect(message).to.equal('missing_arguments');
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });
//   });

//   describe('lib iap - apple', () => {
//     describe('error', () => {
//       before(() => {
//         spyMongo = spyMongoMethods(mongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//         sandbox.stub(iap, 'validate').callsFake(() => {
//           // eslint-disable-next-line no-throw-literal
//           throw '{"error":{},"status":21002,"message":"The data in the receipt-data property was malformed."}';
//         });
//       });

//       it('should return 500', async () => {
//         const response = await handler(appleEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(500);
//         expect(message).to.equal(
//           'The data in the receipt-data property was malformed.'
//         );
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });

//     describe('success', () => {
//       before(() => {
//         spyMongo = spyMongoMethods(mongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//         stubLibAddBalance = sandbox
//           .stub(addBalanceLib, 'addBalance')
//           .returns(true);
//         sandbox.stub(iap, 'validate').returns([]);
//         sandbox.stub(iap, 'getPurchaseData').returns([{ productId }]);
//       });

//       it('should return 200', async () => {
//         const { appId, principalId: userId } =
//           baseEvent.requestContext.authorizer;
//         const { deviceId } = baseEvent.queryStringParameters;
//         const response = await handler(appleEvent);
//         const price = parseFloat(articlePrices.article_05);
//         sinon.assert.calledWith(
//           stubLibAddBalance,
//           appId,
//           userId,
//           deviceId,
//           price
//         );
//         expect(response.statusCode).to.eq(200);
//         expect(JSON.parse(response.body)).to.eql({ ok: true, data: [] });
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });
//   });

//   describe('lib iap - google', () => {
//     describe('error', () => {
//       before(() => {
//         spyMongo = spyMongoMethods(mongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//         sandbox.stub(iap, 'validate').callsFake(() => {
//           // eslint-disable-next-line no-throw-literal
//           throw '{"error":{},"status":21002,"message":"The data in the receipt-data property was malformed."}';
//         });
//       });

//       it('should return 500', async () => {
//         const response = await handler(googleEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(500);
//         expect(message).to.equal(
//           'The data in the receipt-data property was malformed.'
//         );
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });

//     describe('success', () => {
//       before(() => {
//         spyMongo = spyMongoMethods(mongoResponse);
//         const fakeClient = {
//           db: spyMongo.db,
//           close: spyMongo.close,
//         };
//         stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
//         stubLibAddBalance = sandbox
//           .stub(addBalanceLib, 'addBalance')
//           .returns(true);
//         sandbox.stub(iap, 'validate').returns([]);
//         sandbox.stub(iap, 'getPurchaseData').returns([{ productId }]);
//       });

//       it('test', async () => {
//         const { appId, principalId: userId } =
//           baseEvent.requestContext.authorizer;
//         const { deviceId } = baseEvent.queryStringParameters;
//         const response = await handler(googleEvent);
//         const price = parseFloat(articlePrices.article_05);
//         sinon.assert.calledWith(
//           stubLibAddBalance,
//           appId,
//           userId,
//           deviceId,
//           price
//         );
//         expect(response.statusCode).to.eq(200);
//         expect(JSON.parse(response.body)).to.eql({ ok: true, data: [] });
//       });

//       after(() => {
//         stubMongo.restore();
//         sandbox.restore();
//       });
//     });
//   });
// });
