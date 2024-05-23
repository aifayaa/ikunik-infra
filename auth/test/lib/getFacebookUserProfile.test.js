// /* eslint-disable import/no-relative-packages */
// import sinon from 'sinon';
// import { before, afterEach, describe, it } from 'mocha';
// import { expect } from 'chai';
// import url from 'url';
// import queryString from 'query-string';

// import request from 'request-promise-native';
// import { getFacebookUserProfile } from '../../lib/getFacebookUserProfile';

// describe('lib - getFacebookUserProfile', () => {
//   const sandbox = sinon.createSandbox();
//   let stubRequestGet;

//   afterEach(() => {
//     sandbox.restore();
//   });

//   describe('request success', () => {
//     let resp;
//     before(async () => {
//       stubRequestGet = sandbox.stub(request, 'get').returns(
//         JSON.stringify({
//           id: 'myFbUserId',
//           name: 'myName',
//           email: 'myEmail',
//           link: 'myLink',
//           first_name: 'myFirstName',
//           last_name: 'myLastName',
//           gender: 'myGender',
//         })
//       );
//       resp = await getFacebookUserProfile('myFbUserId', 'myToken');
//     });

//     it('should call graphAPI with right args', () => {
//       const args = stubRequestGet.args[0];
//       const { search, pathname } = url.parse(args[0].url);
//       const parsed = queryString.parse(search);
//       expect(parsed).to.have.any.keys('access_token', 'fields');
//       expect(parsed).to.includes({
//         access_token: 'myToken',
//       });
//       expect(pathname.split('/')[2]).to.equal('myFbUserId');
//     });
//     it('should return', () => {
//       expect(resp).to.includes({
//         id: 'myFbUserId',
//         name: 'myName',
//         email: 'myEmail',
//         link: 'myLink',
//         first_name: 'myFirstName',
//         last_name: 'myLastName',
//         gender: 'myGender',
//       });
//     });
//   });

//   describe('request success: invalid data', () => {
//     let resp = {};
//     let error;
//     before(async () => {
//       stubRequestGet = sandbox.stub(request, 'get').returns(
//         JSON.stringify({
//           id: 'myFbUserId',
//           name: 'myName',
//           email: 5, // wrong type
//           link: 'myLink',
//           // first_name: 'myFirstName',
//           last_name: 'myLastName',
//           gender: 'myGender',
//           not_required_field: 'iWasReturnedAgainstMyWill',
//         })
//       );
//       try {
//         resp = await getFacebookUserProfile('myFbUserId', 'myToken');
//       } catch (e) {
//         error = e;
//       }
//     });

//     it('should not crash about missing value in response (first_name)', () => {
//       expect(error).to.not.exist;
//     });
//     it('should not return unexpected fields', () => {
//       expect(resp).to.not.include(['not_required_field']);
//     });
//     it('should not return unexpected value type fields', () => {
//       expect(resp).to.not.include(['email']);
//     });
//     it('should return all other fields', () => {
//       expect(resp).to.include({
//         id: 'myFbUserId',
//         name: 'myName',
//         link: 'myLink',
//         last_name: 'myLastName',
//         gender: 'myGender',
//       });
//     });
//   });

//   describe('request error', () => {
//     it('should forward error', async () => {
//       sandbox.stub(request, 'get').throws();
//       try {
//         await getFacebookUserProfile('myFbUserId', 'myToken');
//       } catch (e) {
//         expect(e).to.exist;
//       }
//     });
//   });
// });
