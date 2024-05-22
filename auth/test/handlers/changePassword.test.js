// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { before, after, beforeEach, afterEach, describe, it } from 'mocha';
// import { expect } from 'chai';

// import handler from '../../handlers/changePassword';
// import * as lib from '../../lib/changePassword';
// import * as libIntl from '../../../libs/intl/intl';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handler - changePassword', () => {
//   let stubLib;
//   let stubIntl;
//   let response;
//   let responseBody;
//   const event = {
//     requestContext: {
//       authorizer: {
//         appId: 'myAppId',
//         principalId: 'myUserId',
//       },
//     },
//   };
//   const fullEvent = {
//     ...event,
//     body: JSON.stringify({
//       oldPassword: 'some_old_password',
//       password: 'some_password',
//     }),
//   };

//   describe('normal password change', () => {
//     before(async () => {
//       stubLib = sinon.stub(lib, 'changePassword');
//       stubIntl = sinon.stub(libIntl, 'getUserLanguage').returns('en');
//       response = await handler({
//         ...fullEvent,
//       });
//       responseBody = JSON.parse(response.body);
//     });

//     after(() => {
//       stubLib.restore();
//       stubIntl.restore();
//     });

//     it('should return 200', () => {
//       expect(response.statusCode).to.equal(200);
//     });

//     it('should return OK', () => {
//       expect(responseBody.message).to.equal('ok');
//     });
//   });

//   describe('invalid password change cases from handler', () => {
//     before(() => {
//       stubLib = sinon.stub(lib, 'changePassword');
//     });

//     after(() => {
//       stubLib.restore();
//     });

//     it('should return missing payload', async () => {
//       response = await handler({
//         ...event,
//       });
//       responseBody = JSON.parse(response.body);
//       expect(responseBody.message).to.equal('missing_payload');
//       expect(response.statusCode).to.equal(400);
//     });

//     it('should return invalid password length', async () => {
//       response = await handler({
//         ...event,
//         body: JSON.stringify({
//           oldPassword: 'anyPasswordHere',
//           password: 'short',
//         }),
//       });
//       responseBody = JSON.parse(response.body);
//       expect(responseBody.message).to.equal('invalid_password_length');
//       expect(response.statusCode).to.equal(400);
//     });

//     it('should return wrong argument type', async () => {
//       response = await handler({
//         ...event,
//         body: JSON.stringify({
//           oldPassword: 42,
//           password: 42,
//         }),
//       });
//       responseBody = JSON.parse(response.body);
//       expect(responseBody.message).to.equal('wrong_argument_type');
//       expect(response.statusCode).to.equal(400);
//     });
//   });

//   describe('invalid password change cases from lib', () => {
//     beforeEach(() => {
//       stubLib = sinon.stub(lib, 'changePassword');
//       stubIntl = sinon.stub(libIntl, 'getUserLanguage').returns('en');
//     });

//     afterEach(() => {
//       stubLib.restore();
//       stubIntl.restore();
//     });

//     it('should return user not found', async () => {
//       stubLib.throws(new Error('user_not_found'));

//       response = await handler({
//         ...fullEvent,
//       });

//       responseBody = JSON.parse(response.body);
//       expect(responseBody.message).to.equal('user_not_found');
//       expect(response.statusCode).to.equal(404);
//     });

//     it('should return a 500 error', async () => {
//       stubLib.throws(new Error('Some error that could not be handled'));

//       response = await handler({
//         ...fullEvent,
//       });

//       expect(response.statusCode).to.equal(500);
//     });
//   });
// });
