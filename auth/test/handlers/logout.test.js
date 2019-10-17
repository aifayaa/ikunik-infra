import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as lib from '../../lib/removeLoginToken';
import handler from '../../handlers/logout';

describe('handlers - logout', () => {
  let stubLib;
  const event = {
    headers: {
      'x-auth-token': 'myToken',
      'x-user-id': 'myId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('missing args', () => {
    ['x-auth-token', 'x-user-id', null].forEach((arg) => {
      const missingEvent = {
        headers: {
          ...event.headers,
        },
      };
      if (!arg) {
        missingEvent.headers = {};
      } else {
        delete missingEvent.headers[arg];
      }
      describe(arg || 'empty', () => {
        let response;
        before(async () => {
          stubLib = sandbox.stub(lib, 'removeLoginToken').returns(false);
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
    });
  });

  describe('lib error', () => {
    describe('any', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'removeLoginToken').throws();
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
      stubLib = sandbox.stub(lib, 'removeLoginToken').returns(true);
      response = await handler(event);
    });
    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });
    it('should call lib with right args', () => {
      expect(stubLib.calledWith(event.headers['x-auth-token'], event.headers['x-user-id']));
    });
    after(() => {
      sandbox.restore();
    });
  });
});
