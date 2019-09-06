import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as lib from '../../lib/getTos';
import handler from '../../handlers/getTos';

describe('handlers - getTos', () => {
  let stubLib;
  const event = {
    requestContext: {
      authorizer: {
        appId: 'crowdaa_app_id',
      },
    },
    pathParameters: {
      id: 'tosId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('Case lib return empty', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getTos').returns([]);
      response = await handler(event);
    });
    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
    });

    it('should call lib with params', () => {
      sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
    });
    it('should return 404', () => {
      expect(response.statusCode).to.eql(404);
    });
    after(sandbox.restore);
  });

  describe('Case lib return results', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getTos').returns([{
        _id: 'tosId',
        appIds: ['crowdaa_app_id'],
      }]);
      response = await handler(event);
    });
    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
    });

    it('should call lib with params', () => {
      sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
    });
    it('should return 200', () => {
      expect(response.statusCode).to.eql(200);
    });
    after(sandbox.restore);
  });
  describe('Case lib trigger error', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getTos').callsFake(() => Promise.reject(new Error('error_message')));
      response = await handler(event);
    });
    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
    });

    it('should call lib with params', () => {
      sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
    });
    it('should return 500', () => {
      expect(response.statusCode).to.eql(500);
    });
    after(sandbox.restore);
  });
});
