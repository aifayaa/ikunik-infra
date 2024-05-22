// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
// import { expect } from 'chai';

// import * as checkPermsFor from '../../../libs/perms/checkPermsFor.ts';
// import * as lib from '../../lib/putArticle';
// import handler from '../../handlers/putArticle';

// /** @TODO Re-enable tests. Skipped after permissions checking update */
// describe.skip('handlers - putArticle', () => {
//   let stubPerms;
//   let stubLib;
//   const event = {
//     requestContext: {
//       authorizer: {
//         perms: JSON.stringify({}),
//         appId: 'crowdaa_app_id',
//         principalId: 'userId',
//       },
//     },
//     pathParameters: {
//       id: 'articleId',
//     },
//     body: JSON.stringify({
//       articleId: 'articleId',
//       categoryId: 'sport',
//       title: 'title',
//       summary: 'sumary',
//       md: '# titre1',
//       pictures: [],
//     }),
//   };
//   const sandbox = sinon.createSandbox();

//   describe('no perms', () => {
//     before(() => {
//       stubPerms = sandbox
//         .stub(checkPermsFor, 'checkPermsForApp')
//         .returns(Promise.resolve(false));
//       stubLib = sandbox.stub(lib, 'putArticle').returns({});
//     });

//     // TODO: FIX TEST (Prints an exception)
//     it('should return 403', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(403);
//       expect(JSON.parse(response.body).message).to.eq('access_forbidden');
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });

//   describe('lib success', () => {
//     const result = { message: 'ok' };

//     before(() => {
//       stubPerms = sandbox
//         .stub(checkPermsFor, 'checkPermsForApp')
//         .returns(Promise.resolve(true));
//       stubLib = sandbox.stub(lib, 'putArticle').returns(result);
//     });

//     it('should return 200', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(200);
//       expect(JSON.parse(response.body)).to.eql(result);
//     });

//     // TODO: FIX TEST
//     it.skip('should called with the good args', () => {
//       const eventParsed = JSON.parse(event.body);
//       const { principalId, appId } = event.requestContext.authorizer;
//       const { id } = event.pathParameters;
//       const opts = {
//         actions: [],
//         feedPicture: undefined,
//         videos: undefined,
//         userId: principalId,
//         appId,
//         categoryId: eventParsed.categoryId,
//         articleId: id,
//         title: eventParsed.title,
//         summary: eventParsed.summary,
//         html: '<h1>titre1</h1>',
//         md: eventParsed.md,
//         pictures: eventParsed.pictures,
//         plainText: 'titre1',
//       };
//       sinon.assert.calledOnce(stubPerms);
//       sinon.assert.calledWith(stubLib, opts);
//     });

//     after(() => {
//       sandbox.restore();
//     });
//   });

//   describe('lib fail', () => {
//     const result = new Error('lib method fail');

//     beforeEach(() => {
//       stubPerms = sandbox
//         .stub(checkPermsFor, 'checkPermsForApp')
//         .returns(Promise.resolve(true));
//       stubLib = sandbox
//         .stub(lib, 'putArticle')
//         .callsFake(() => Promise.reject(result));
//     });

//     afterEach(() => {
//       sandbox.restore();
//     });

//     it('should return 500', async () => {
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(500);
//     });

//     it('event.body not defined', async () => {
//       event.body = undefined;
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(500);
//     });

//     it('event.body.field not defined', async () => {
//       event.body = JSON.stringify({
//         articleId: undefined,
//       });
//       const response = await handler(event);
//       expect(response.statusCode).to.eq(500);
//     });
//   });
// });
