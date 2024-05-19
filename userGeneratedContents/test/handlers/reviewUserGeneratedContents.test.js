// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after } from 'mocha';
// import { expect } from 'chai';
// import * as checkOwner from '../../../libs/perms/checkOwner';
// import * as lib from '../../lib/reviewUserGeneratedContents';
// import handler from '../../handlers/reviewUserGeneratedContents';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handlers - reviewUserGeneratedContents', () => {
//   let stubLib;
//   let stubOwner;
//   const event = {
//     body: JSON.stringify({
//       reason: 'reason',
//       moderated: true,
//     }),
//     requestContext: {
//       authorizer: {
//         perms: JSON.stringify({}),
//         appId: 'crowdaa_app_id',
//         principalId: 'userId',
//       },
//     },
//     pathParameters: {
//       id: 'userGeneratedContentsId',
//     },
//   };
//   const sandbox = sinon.createSandbox();

//   describe('no perms', () => {
//     let response;
//     before(async () => {
//       stubOwner = sandbox
//         .stub(checkOwner, 'default')
//         .returns({ results: {}, error: 'forbidden_user' });
//       stubLib = sandbox.stub(lib, 'default').returns(true);
//       response = await handler(event);
//     });

//     it('should return 403', () => {
//       expect(response.statusCode).to.eq(403);
//       expect(JSON.parse(response.body).message).to.eq('forbidden_user');
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });

//   describe('lib error', () => {
//     describe('missing valid', () => {
//       let response;
//       before(async () => {
//         stubOwner = sandbox
//           .stub(checkOwner, 'default')
//           .returns({ results: {}, error: '' });
//         stubLib = sandbox.stub(lib, 'default').returns(true);
//         const finalEvent = { ...event };
//         finalEvent.body = JSON.stringify({});
//         response = await handler(finalEvent);
//       });

//       it('should return 400', () => {
//         expect(response.statusCode).to.equal(400);
//         expect(JSON.parse(response.body).message).to.eq('wrong_argument_type');
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });

//     describe('any', () => {
//       let response;
//       before(async () => {
//         stubOwner = sandbox
//           .stub(checkOwner, 'default')
//           .returns({ results: {}, error: '' });
//         stubLib = sandbox.stub(lib, 'default').throws();
//         response = await handler(event);
//       });

//       it('should call checkPerms with safeExec option', () => {
//         const {
//           args: [, , , , , callOptions],
//         } = stubOwner.getCall(0);
//         expect(callOptions.safeExec).to.be.true;
//       });

//       it('should return 500', () => {
//         expect(response.statusCode).to.equal(500);
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });
//   });

//   describe('success', () => {
//     describe('all ok', () => {
//       let response;

//       before(async () => {
//         stubOwner = sandbox
//           .stub(checkOwner, 'default')
//           .returns({ results: {}, error: '' });
//         stubLib = sandbox.stub(lib, 'default').returns(true);
//         response = await handler(event);
//       });

//       it('should return 200', () => {
//         expect(response.statusCode).to.equal(200);
//       });

//       it('should call lib with right args', () => {
//         const { principalId, appId } = event.requestContext.authorizer;
//         const bodyParsed = JSON.parse(event.body);

//         sinon.assert.calledOnce(stubOwner);
//         sinon.assert.calledWith(stubLib, appId, principalId, {}, bodyParsed);
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });
//   });
// });
