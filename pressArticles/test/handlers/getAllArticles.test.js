import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as checkPerms from '../../../libs/perms/checkPerms';
import * as lib from '../../lib/getArticles';
import handler from '../../handlers/getAllArticles';

describe('handlers - getAllArticles', () => {
  let stubLib;
  let stubPerms;
  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
      },
    },
    queryStringParameters: {
      category: 'A_crowdaa_cat',
      start: 0,
      limit: 10,
    },
  };
  const sandbox = sinon.createSandbox();

  describe('no perms', () => {
    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(false);
      stubLib = sandbox.stub(lib, 'getArticles').returns({});
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
    const getArticlesResult = {
      articles: [
        {},
        {},
      ],
      total: 2,
    };
    let response;
    before(async () => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'getArticles').returns(getArticlesResult);
      response = await handler(event);
    });

    it('should call lib with right args', () => {
      const { args } = stubLib.getCall(0);
      expect(args).to.deep.equal(['A_crowdaa_cat', 0, 10, 'crowdaa_app_id', {
        noCategory: true,
        onlyPublished: false,
      }]);
    });

    it('should return 200', () => {
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.deep.eq(getArticlesResult);
    });

    it('should called with the good args', () => {
      const {
        category,
        start,
        limit,
      } = event.queryStringParameters;
      const { appId } = event.requestContext.authorizer;
      sinon.assert.calledOnce(stubPerms);
      sinon.assert.calledWith(
        stubLib,
        category,
        start,
        limit,
        appId,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const getArticlesResult = new Error('lib method fail');

    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'getArticles').callsFake(() => Promise.reject(getArticlesResult));
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
