// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after } from 'mocha';
// import { expect } from 'chai';

// import * as lib from '../../lib/getArticles';
// import handler from '../../handlers/getArticles';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handlers - getArticles', () => {
//   let stubLib;
//   const event = {
//     requestContext: {
//       authorizer: {
//         appId: 'crowdaa_app_id',
//       },
//     },
//     queryStringParameters: {
//       category: 'A_crowdaa_cat',
//       start: 0,
//       limit: 10,
//     },
//   };
//   const sandbox = sinon.createSandbox();

//   describe('lib success', () => {
//     const libResult = {
//       articles: [{}, {}],
//       total: 2,
//     };

//     before(() => {
//       stubLib = sandbox.stub(lib, 'getArticles').returns(libResult);
//     });

//     it('should return 200', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(200);
//       expect(JSON.parse(response.body)).to.deep.eq(libResult);
//     });

//     it('should called with the good args', () => {
//       const { category, start, limit } = event.queryStringParameters;
//       const { appId } = event.requestContext.authorizer;

//       sinon.assert.calledWith(stubLib, category, start, limit, appId);
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });

//   describe('lib fail', () => {
//     const libResult = new Error('lib method fail');

//     before(() => {
//       stubLib = sandbox
//         .stub(lib, 'getArticles')
//         .callsFake(() => Promise.reject(libResult));
//     });

//     it('should return 500', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(500);
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });
// });
