/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as checkPermsFor from '../../../libs/perms/checkPermsFor';
import * as lib from '../../lib/unpublishArticle';
import handler from '../../handlers/unpublishArticle';

describe('handlers - unpublishArticle', () => {
  let stubLib;
  let stubPerms;
  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
    },
    pathParameters: {
      id: 'articleId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('no perms', () => {
    before(() => {
      stubPerms = sandbox
        .stub(checkPermsFor, 'checkPermsForApp')
        .returns(Promise.resolve(false));
      stubLib = sandbox.stub(lib, 'unpublishArticle').returns({});
    });

    it('should return 403', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(403);
      expect(JSON.parse(response.body).message).to.eq('access_forbidden');
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib success', () => {
    const libResult = { message: 'ok' };

    before(() => {
      stubPerms = sandbox
        .stub(checkPermsFor, 'checkPermsForApp')
        .returns(Promise.resolve(true));
      stubLib = sandbox.stub(lib, 'unpublishArticle').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql(libResult);
    });

    it('should called with the good args', () => {
      const { id } = event.pathParameters;
      const { principalId, appId } = event.requestContext.authorizer;
      sinon.assert.calledOnce(stubPerms);
      sinon.assert.calledWith(stubLib, principalId, appId, id);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const libResult = new Error('lib method fail');

    before(() => {
      stubPerms = sandbox
        .stub(checkPermsFor, 'checkPermsForApp')
        .returns(Promise.resolve(true));
      stubLib = sandbox
        .stub(lib, 'unpublishArticle')
        .callsFake(() => Promise.reject(libResult));
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
