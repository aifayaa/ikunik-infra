import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as checkOwner from '../../../libs/perms/checkOwner';
import * as lib from '../../lib/removeUserGeneratedContents';
import handler from '../../handlers/removeUserGeneratedContents';

describe('handlers - removeUserGeneratedContents', () => {
  let stubLib;
  let stubOwner;
  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
    },
    pathParameters: {
      id: 'userGeneratedContentsId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('no perms', () => {
    before(() => {
      stubOwner = sandbox.stub(checkOwner, 'default').returns({ code: 403, message: 'forbidden_user' });
      stubLib = sandbox.stub(lib, 'default').returns({});
    });

    it('should return 403', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(403);
      expect(JSON.parse(response.body).message).to.eq('forbidden_user');
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('content not found', () => {
    before(() => {
      stubOwner = sandbox.stub(checkOwner, 'default').returns({ code: 404, message: 'content_not_found' });
      stubLib = sandbox.stub(lib, 'default').returns({});
    });

    it('should return 403', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(404);
      expect(JSON.parse(response.body).message).to.eq('content_not_found');
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib success', () => {
    const libResult = 'ok';

    before(() => {
      stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
      stubLib = sandbox.stub(lib, 'default').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
    });

    it('should called with the good args', () => {
      const { id } = event.pathParameters;
      const {
        principalId,
        appId,
      } = event.requestContext.authorizer;
      sinon.assert.calledOnce(stubOwner);
      sinon.assert.calledWith(
        stubLib,
        appId,
        principalId,
        id,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const libResult = new Error('lib method fail');

    before(() => {
      stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
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
