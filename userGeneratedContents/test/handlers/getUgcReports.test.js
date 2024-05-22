// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after } from 'mocha';
// import { expect } from 'chai';
// import * as checkPermsFor from '../../../libs/perms/checkPermsFor';
// import * as lib from '../../lib/getUserGeneratedContentReports';
// import handler from '../../handlers/getUserGeneratedContentReports';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// /* Previous line commented */
// describe.skip('handlers - getUserGeneratedContentReports', () => {
//   // describe.only('handlers - getUserGeneratedContentReports', () => {
//   let stubLib;

//   const defaultStringParameters = {
//     start: 0,
//     limit: 10,
//     countOnly: false,
//   };

//   const event = {
//     requestContext: {
//       authorizer: {
//         perms: JSON.stringify({}),
//         appId: 'crowdaa_app_id',
//       },
//       resourcePath: '',
//     },
//     pathParameters: {
//       id: 'ugcId',
//     },
//     queryStringParameters: defaultStringParameters,
//   };
//   const sandbox = sinon.createSandbox();

//   describe('fail cases', () => {
//     const libResult = 'ok';
//     describe('user has not enough rights', () => {
//       let response;
//       before(async () => {
//         stubLib = sandbox.stub(lib, 'default').returns(libResult);
//         sandbox
//           .stub(checkPermsFor, 'checkPermsForApp')
//           .returns(Promise.resolve(false));
//         response = await handler(event);
//       });
//       it('should return 403', () => {
//         expect(response.statusCode).to.eq(403);
//       });
//       it('should not call lib', () => {
//         expect(stubLib.called).to.be.false;
//       });
//       after(() => {
//         sandbox.restore();
//       });
//     });

//     describe('args are invalid', () => {
//       // eslint-disable-next-line no-restricted-syntax
//       for (const [label, value] of [
//         ['limit', 'notAnInteger'],
//         ['start', 'notAnInteger'],
//         ['countOnly', 'notABool'],
//       ]) {
//         // eslint-disable-next-line no-loop-func
//         describe(`arg ${label} is ${value}`, () => {
//           let response;
//           before(async () => {
//             stubLib = sandbox.stub(lib, 'default').returns(libResult);
//             sandbox
//               .stub(checkPermsFor, 'checkPermsForApp')
//               .returns(Promise.resolve(true));
//             const invalidQueryStringParams = {
//               ...defaultStringParameters,
//               [label]: value,
//             };
//             response = await handler({
//               ...event,
//               queryStringParameters: invalidQueryStringParams,
//             });
//           });
//           it('should return 400', () => {
//             expect(response.statusCode).to.eq(400);
//           });
//           it('should not call lib', () => {
//             expect(stubLib.called).to.be.false;
//           });
//           after(() => {
//             sandbox.restore();
//           });
//         });
//       }
//     });
//   });

//   describe('lib fail', () => {
//     let response;
//     before(async () => {
//       stubLib = sandbox
//         .stub(lib, 'default')
//         .throws(new Error('lib method fail'));
//       sandbox
//         .stub(checkPermsFor, 'checkPermsForApp')
//         .returns(Promise.resolve(true));
//       response = await handler(event);
//     });

//     it('should return 500', () => {
//       expect(response.statusCode).to.eq(500);
//     });
//     it('should call lib', () => {
//       expect(stubLib.called).to.be.true;
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });

//   describe('lib success', () => {
//     const libResult = { items: [], totalCount: 0 };

//     describe('args well passed to lib', () => {
//       // eslint-disable-next-line no-restricted-syntax
//       for (const parameters of [
//         {},
//         { limit: '20' },
//         { start: '20' },
//         { countOnly: true },
//       ]) {
//         const { limit, start, countOnly } = parameters;
//         // eslint-disable-next-line no-loop-func
//         describe(`args are limit:${limit}, start:${start}, countOnly:${countOnly}`, () => {
//           let response;
//           before(async () => {
//             stubLib = sandbox.stub(lib, 'default').returns(libResult);
//             sandbox
//               .stub(checkPermsFor, 'checkPermsForApp')
//               .returns(Promise.resolve(true));
//             const queryStringParameters = {
//               ...defaultStringParameters,
//               ...parameters,
//             };
//             response = await handler({ ...event, queryStringParameters });
//           });
//           it('should return 200', () => {
//             expect(response.statusCode).to.eq(200);
//           });
//           it('should call lib with args', () => {
//             expect(stubLib.getCall(0).args).to.eql([
//               event.requestContext.authorizer.appId,
//               event.pathParameters.id,
//               { ...defaultStringParameters, ...parameters },
//             ]);
//           });

//           if (countOnly) {
//             it('should return countOnly', () => {
//               expect(JSON.parse(response.body)).to.deep.eq({ totalCount: 0 });
//             });
//           } else {
//             it('should return all', () => {
//               expect(JSON.parse(response.body)).to.deep.eq({
//                 totalCount: 0,
//                 items: [],
//               });
//             });
//           }
//           after(() => {
//             sandbox.restore();
//           });
//         });
//       }
//     });
//   });
// });
