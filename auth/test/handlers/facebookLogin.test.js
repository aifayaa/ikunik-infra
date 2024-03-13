/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as lib from '../../lib/getUserByFacebook';
import handler from '../../handlers/facebookLogin';

/** @TODO Re-enable tests. Skipped after permissions checking update */
describe.skip('handlers - facebookLogin', () => {
  let stubLib;
  const event = {
    body: JSON.stringify({
      accessToken: 'myAccessToken',
    }),
    requestContext: {
      authorizer: {
        appId: 'myAppId',
      },
    },
  };
  const sandbox = sinon.createSandbox();

  describe('missing body', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getUserByFacebook').returns(false);
      response = await handler({});
    });

    it('should not call lib', () => {
      expect(stubLib.called).to.equal(false);
    });

    it('should return 400', () => {
      expect(response.statusCode).to.equal(400);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib error', () => {
    describe('invalid_token', () => {
      let response;
      before(async () => {
        stubLib = sandbox
          .stub(lib, 'getUserByFacebook')
          .throws(new Error('invalid_token'));
        response = await handler(event);
      });
      it('should return 401', () => {
        expect(response.statusCode).to.equal(401);
      });
      after(() => {
        sandbox.restore();
      });
    });
    describe('any', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'getUserByFacebook').throws();
        response = await handler(event);
      });
      it('should return 500', () => {
        expect(response.statusCode).to.equal(500);
      });
      after(() => {
        sandbox.restore();
      });
    });
  });
  describe('success', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getUserByFacebook').returns(true);
      response = await handler(event);
    });
    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });
    it('should call lib with right args', () => {
      expect(stubLib.calledWith('myAccessToken'));
    });
    after(() => {
      sandbox.restore();
    });
  });
});
