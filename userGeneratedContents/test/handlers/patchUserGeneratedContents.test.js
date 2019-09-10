import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as checkOwner from '../../../libs/perms/checkOwner';
import * as lib from '../../lib/patchUserGeneratedContents';
import handler from '../../handlers/patchUserGeneratedContents';

describe('handlers - patchUserGeneratedContents', () => {
  let stubLib;
  let stubOwner;
  const event = {
    body: JSON.stringify({
      data: 'test',
    }),
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
      stubLib = sandbox.stub(lib, 'default').returns(true);
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

  describe('lib error', () => {
    describe('empty data', () => {
      before(() => {
        stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
        stubLib = sandbox.stub(lib, 'default').returns(true);
      });

      it('should return 500', async () => {
        const finalEvent = Object.assign({}, event);
        finalEvent.body = JSON.stringify({ data: {} });
        const response = await handler(finalEvent);
        expect(response.statusCode).to.equal(500);
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('any', () => {
      before(() => {
        stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
        stubLib = sandbox.stub(lib, 'default').throws();
      });

      it('should return 500', async () => {
        const response = await handler(event);
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
      stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
      stubLib = sandbox.stub(lib, 'default').returns(true);
      response = await handler(event);
    });

    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should call lib with right args', () => {
      const { id } = event.pathParameters;
      const {
        principalId,
        appId,
      } = event.requestContext.authorizer;
      const bodyParsed = JSON.parse(event.body);
      const {
        data,
      } = bodyParsed;

      sinon.assert.calledOnce(stubOwner);
      sinon.assert.calledWith(
        stubLib,
        appId,
        principalId,
        id,
        data,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
