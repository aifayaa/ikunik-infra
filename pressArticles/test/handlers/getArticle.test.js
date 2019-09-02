import sinon from 'sinon';
import { describe, it, before, after, afterEach } from 'mocha';
import { expect } from 'chai';

import * as checkPerms from '../../../libs/perms/checkPerms';
import * as lib from '../../lib/getArticle';
import handler from '../../handlers/getArticle';

describe('handlers - getArticle', () => {
  let stubLib;
  let stubPerms;
  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
      },
    },
    pathParameters: {
      id: 'articleId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('no perms', () => {
    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(false);
      stubLib = sandbox.stub(lib, 'getArticle').returns({});
    });

    it('should call lib with publishedOnly true', async () => {
      const response = await handler(event);
      sinon.assert.calledOnce(stubLib);
      sinon.assert.calledWith(
        stubLib, 'articleId', 'crowdaa_app_id',
        { getPictures: true, publishedOnly: true },
      );
      expect(response.statusCode).to.eq(200);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib success', () => {
    const libResult = 'ok';
    let response;

    before(async () => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'getArticle').returns(libResult);
      response = await handler(event);
    });

    it('should return 200', () => {
      expect(response.statusCode).to.eq(200);
      expect(response.body).to.eq(libResult);
    });

    it('should be called with the good args', () => {
      const { appId } = event.requestContext.authorizer;
      const { id } = event.pathParameters;
      sinon.assert.calledOnce(stubPerms);
      sinon.assert.calledWith(
        stubLib,
        id,
        appId,
        { getPictures: true, publishedOnly: false },
      );
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const libResult = new Error('lib method fail');

    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'getArticle').callsFake(() => Promise.reject(libResult));
    });

    it('should return 500', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib return null', () => {
    [true, false].forEach((havePerms) => {
      it(`should return 404 if user ${!havePerms && 'don\'t'} have perms`, async () => {
        stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(havePerms);
        stubLib = sandbox.stub(lib, 'getArticle').returns(null);
        const response = await handler(event);
        expect(response.statusCode).to.eq(404);
      });
    });

    afterEach(() => {
      sandbox.restore();
    });
  });
});
