import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/getAllUserGeneratedContents';
import handler from '../../handlers/getAllUserGeneratedContents';

describe('handlers - getAllUserGeneratedContents', () => {
  let stubLib;

  const defaultStringParameters = {
    start: false,
    limit: false,
    type: false,
    userId: false,
  };

  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
      },
    },
    queryStringParameters: defaultStringParameters,
  };
  const sandbox = sinon.createSandbox();

  describe('lib success', () => {
    const libResult = 'ok';

    before(() => {
      stubLib = sandbox.stub(lib, 'default').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(response.body).to.eq(libResult);
    });

    it('should called with the good args', () => {
      const {
        appId,
      } = event.requestContext.authorizer;
      const {
        start,
        limit,
        type,
        userId,
      } = event.queryStringParameters;
      sinon.assert.calledWith(
        stubLib,
        appId,
        start,
        limit,
        type,
        userId,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const libResult = new Error('lib method fail');

    before(() => {
      stubLib = sandbox.stub(lib, 'default').callsFake(() => Promise.reject(libResult));
    });

    it('should return 500', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    after(() => {
      sandbox.restore();
    });
  });
});
