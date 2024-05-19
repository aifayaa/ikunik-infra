// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after } from 'mocha';
// import { expect } from 'chai';
// import * as lib from '../../lib/findPurchasableProduct';
// import handler from '../../handlers/findPurchasableProduct';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handlers - findPurchasableProduct', () => {
//   let stubLib;
//   const event = {
//     requestContext: {
//       authorizer: {
//         appId: 'crowdaa_app_id',
//         perms: JSON.stringify({ purchasableProducts_find: true }),
//       },
//     },
//     queryStringParameters: {
//       contentId: 'contentId',
//       contentCollection: 'contentCollection',
//     },
//   };

//   const sandbox = sinon.createSandbox();

//   describe('lib error', () => {
//     describe('perms error', () => {
//       before(() => {
//         stubLib = sandbox.stub(lib, 'findPurchasableProduct').throws();
//       });

//       it('access_forbidden', async () => {
//         const testEvent = JSON.parse(JSON.stringify(event));
//         testEvent.requestContext.authorizer.perms = JSON.stringify({});
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(403);
//         expect(message).to.equal('access_forbidden');
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });

//     describe('missing_argument', () => {
//       before(() => {
//         stubLib = sandbox.stub(lib, 'findPurchasableProduct').throws();
//       });

//       it('missing contentId', async () => {
//         const testEvent = JSON.parse(JSON.stringify(event));
//         delete testEvent.queryStringParameters.contentId;
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(400);
//         expect(message).to.equal('missing_argument');
//       });

//       it('missing contentCollection', async () => {
//         const testEvent = JSON.parse(JSON.stringify(event));
//         delete testEvent.queryStringParameters.contentCollection;
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(400);
//         expect(message).to.equal('missing_argument');
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });

//     describe('wrong_argument_type', () => {
//       before(() => {
//         stubLib = sandbox.stub(lib, 'findPurchasableProduct').throws();
//       });

//       it('wrong type for contentId', async () => {
//         const testEvent = JSON.parse(JSON.stringify(event));
//         testEvent.queryStringParameters.contentId = 4;
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(400);
//         expect(message).to.equal('wrong_argument_type');
//       });

//       it('wrong type for contentCollection', async () => {
//         const testEvent = JSON.parse(JSON.stringify(event));
//         testEvent.queryStringParameters.contentCollection = 4;
//         const response = await handler(testEvent);
//         const { message } = JSON.parse(response.body);
//         expect(response.statusCode).to.equal(400);
//         expect(message).to.equal('wrong_argument_type');
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });

//     describe('lib fail', () => {
//       const libResult = new Error('lib method fail');

//       before(() => {
//         stubLib = sandbox
//           .stub(lib, 'findPurchasableProduct')
//           .callsFake(() => Promise.reject(libResult));
//       });

//       it('should return 500', async () => {
//         const response = await handler(event);
//         expect(response.statusCode).to.eq(500);
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });
//   });

//   describe('lib success', () => {
//     const libResult = 'ok';

//     before(() => {
//       stubLib = sandbox.stub(lib, 'findPurchasableProduct').returns(libResult);
//     });

//     it('should return 200', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(200);
//       expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
//     });

//     it('should called with the good args', () => {
//       const { appId } = event.requestContext.authorizer;
//       sinon.assert.calledWith(stubLib, appId, event.queryStringParameters);
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });
// });
