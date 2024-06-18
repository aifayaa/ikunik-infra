// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { before, afterEach, describe, it } from 'mocha';
// import { expect } from 'chai';
// import url from 'url';
// import queryString from 'query-string';

// import request from 'request-promise-native';
// import { getFacebookLongLiveToken } from '../../lib/getFacebookLongLiveToken';

// describe('lib - getFacebookLongLiveToken', () => {
//   const sandbox = sinon.createSandbox();
//   let stubRequestGet;

//   afterEach(() => {
//     sandbox.restore();
//   });

//   describe('request success', () => {
//     let resp;
//     before(async () => {
//       stubRequestGet = sandbox.stub(request, 'get');
//       stubRequestGet
//         .onCall(0)
//         .returns(JSON.stringify({ access_token: 'myLongLifeToken' }));
//       stubRequestGet.onCall(1).returns(
//         JSON.stringify({
//           data: { user_id: 'myUserId', expires_at: 'expirationDate' },
//         })
//       );
//       resp = await getFacebookLongLiveToken('myShortLifeToken', 'myAppToken');
//     });

//     it('should call graphAPI to get llToken with right args', () => {
//       const args = stubRequestGet.args[0];
//       const { search } = url.parse(args[0].url);
//       const parsed = queryString.parse(search);
//       expect(parsed).to.have.any.keys(
//         'client_id',
//         'client_secret',
//         'grant_type',
//         'fb_exchange_token'
//       );
//       expect(parsed).to.includes({
//         grant_type: 'fb_exchange_token',
//         fb_exchange_token: 'myShortLifeToken',
//       });
//     });
//     it('should call graphAPI to get llToken info with right args', () => {
//       const args = stubRequestGet.args[1];
//       const { search } = url.parse(args[0].url);
//       const parsed = queryString.parse(search);
//       expect(parsed).to.have.any.keys('input_token', 'access_token');
//       expect(parsed).to.includes({
//         input_token: 'myLongLifeToken',
//         access_token: 'myAppToken',
//       });
//     });
//     it('should return', () => {
//       expect(resp).to.includes({
//         accessToken: 'myLongLifeToken',
//         expiresAt: 'expirationDate',
//         fbUserId: 'myUserId',
//       });
//     });
//   });

//   describe('request error', () => {
//     it('should forward error', async () => {
//       sandbox.stub(request, 'get').throws();
//       try {
//         await getFacebookLongLiveToken('myShortLifeToken', 'myAppToken');
//       } catch (e) {
//         expect(e).to.exist;
//       }
//     });
//   });
// });
