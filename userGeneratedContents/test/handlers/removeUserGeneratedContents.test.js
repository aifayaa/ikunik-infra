// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after } from 'mocha';
// import { expect } from 'chai';
// import * as checkOwner from '../../../libs/perms/checkOwner';
// import * as checkPermsFor from '../../../libs/perms/checkPermsFor.ts';
// import * as lib from '../../lib/removeUserGeneratedContents';
// import handler from '../../handlers/removeUserGeneratedContents';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handlers - removeUserGeneratedContents', () => {
//   let stubLib;
//   let stubOwner;
//   const event = {
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

//   describe('perms check', () => {
//     [
//       {
//         title: 'not owner, not moderator',
//         isModerator: false,
//         isOwner: false,
//         shouldSucceed: false,
//       },
//       {
//         title: 'not owner but moderator',
//         isModerator: true,
//         isOwner: false,
//         shouldSucceed: true,
//       },
//       {
//         title: 'owner but not moderator',
//         isModerator: false,
//         isOwner: true,
//         shouldSucceed: true,
//       },
//       {
//         title: 'owner and moderator',
//         isModerator: true,
//         isOwner: true,
//         shouldSucceed: true,
//       },
//     ].forEach(({ title, isModerator, isOwner, shouldSucceed }) => {
//       describe(title, () => {
//         const resultCode = shouldSucceed ? 200 : 403;
//         before(() => {
//           if (isOwner) {
//             stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
//           } else {
//             stubOwner = sandbox
//               .stub(checkOwner, 'default')
//               .throws(new Error('forbidden_user'));
//           }
//           sandbox
//             .stub(checkPermsFor, 'checkPermsForApp')
//             .returns(Promise.resolve(isModerator));
//           stubLib = sandbox.stub(lib, 'default').returns({});
//         });
//         it(`should return ${resultCode}`, async () => {
//           const response = await handler(event);
//           expect(response.statusCode).to.eq(resultCode);
//           if (!shouldSucceed)
//             expect(JSON.parse(response.body).message).to.eq('forbidden_user');
//         });
//         after(() => {
//           sandbox.restore();
//         });
//       });
//     });
//   });

//   describe('content not found', () => {
//     before(() => {
//       stubOwner = sandbox
//         .stub(checkOwner, 'default')
//         .throws(new Error('content_not_found'));
//       sandbox
//         .stub(checkPermsFor, 'checkPermsForApp')
//         .returns(Promise.resolve(true));
//       stubLib = sandbox.stub(lib, 'default').returns({});
//     });

//     it('should return 404', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(404);
//       expect(JSON.parse(response.body).message).to.eq('content_not_found');
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });

//   describe('lib success', () => {
//     const libResult = 'ok';
//     describe('is Moderator case', () => {
//       before(() => {
//         stubOwner = sandbox.stub(checkOwner, 'default').returns(false);
//         sandbox
//           .stub(checkPermsFor, 'checkPermsForApp')
//           .returns(Promise.resolve(true));
//         stubLib = sandbox.stub(lib, 'default').returns(libResult);
//       });

//       it('should return 200', async () => {
//         const response = await handler(event);
//         expect(response.statusCode).to.eq(200);
//         expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
//       });

//       it('should called with the good args', () => {
//         const { id } = event.pathParameters;
//         const { principalId, appId } = event.requestContext.authorizer;
//         sinon.assert.calledOnce(stubOwner);
//         sinon.assert.calledWith(stubLib, appId, principalId, id, {
//           moderationInfo: 'content has been moderated',
//         });
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });
//     describe('is Owner case', () => {
//       before(() => {
//         stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
//         sandbox
//           .stub(checkPermsFor, 'checkPermsForApp')
//           .returns(Promise.resolve(false));
//         stubLib = sandbox.stub(lib, 'default').returns(libResult);
//       });

//       it('should return 200', async () => {
//         const response = await handler(event);
//         expect(response.statusCode).to.eq(200);
//         expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
//       });

//       it('should called with the good args', () => {
//         const { id } = event.pathParameters;
//         const { principalId, appId } = event.requestContext.authorizer;
//         sinon.assert.calledOnce(stubOwner);
//         sinon.assert.calledWith(stubLib, appId, principalId, id, {
//           moderationInfo: null,
//         });
//       });

//       after(() => {
//         sandbox.restore();
//       });
//     });
//   });

//   describe('lib fail', () => {
//     const libResult = new Error('lib method fail');

//     before(() => {
//       stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
//       sandbox
//         .stub(checkPermsFor, 'checkPermsForApp')
//         .returns(Promise.resolve(true));
//       stubLib = sandbox
//         .stub(lib, 'default')
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
