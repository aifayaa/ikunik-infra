import sinon from 'sinon';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import * as getArticle from '../../lib/getArticle';
import * as doSendNotifications from '../../lib/sendNotifications';
import * as checkPerms from '../../../libs/perms/checkPerms';
import * as lib from '../../lib/publishArticle';
import handler from '../../handlers/publishArticle';
import prepareNotif from '../../lib/prepareNotifString';

describe('handlers - publishArticle', () => {
  let stubLib;
  let stubPerms;
  let stubSendNotifications;
  let stubGetArticle;
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
    body: JSON.stringify({
      draftId: 'draftId',
      sendNotifications: false,
    }),
  };
  const sandbox = sinon.createSandbox();

  describe('no perms', () => {
    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(false);
      stubLib = sandbox.stub(lib, 'publishArticle').returns({});
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
    const libResult = 'ok';

    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'publishArticle').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(response.body).to.eq(libResult);
    });

    it('should called with the good args', () => {
      const eventParsed = JSON.parse(event.body);
      const { principalId, appId } = event.requestContext.authorizer;
      const { id } = event.pathParameters;
      sinon.assert.calledOnce(stubPerms);
      sinon.assert.calledWith(
        stubLib,
        principalId,
        appId,
        id,
        eventParsed.draftId,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const libResult = new Error('lib method fail');

    beforeEach(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'publishArticle').callsFake(() => Promise.reject(libResult));
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return 500', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    it('event.body not defined', async () => {
      event.body = undefined;
      const response = await handler(event);
      expect(JSON.parse(response.body).message).to.eq('mal_formed_request');
      expect(response.statusCode).to.eq(500);
    });

    it('event.body.field not defined', async () => {
      event.body = JSON.stringify({
        draftId: undefined,
        sendNotifications: false,
      });
      const response = await handler(event);
      expect(JSON.parse(response.body).message).to.eq('mal_formed_request');
      expect(response.statusCode).to.eq(500);
    });
  });

  describe('send notification', () => {
    const article = { title: 'title', plainText: 'plainText' };

    before(() => {
      event.body = JSON.stringify({
        draftId: 'draftId',
        sendNotifications: true,
      });
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubGetArticle = sandbox.stub(getArticle, 'getArticle').returns(article);
      stubSendNotifications = sandbox.stub(doSendNotifications, 'doSendNotifications').returns(true);
      stubLib = sandbox.stub(lib, 'publishArticle').returns(true);
    });

    it('should send notifications', async () => {
      const {
        appId,
      } = event.requestContext.authorizer;
      const { id } = event.pathParameters;
      const opts = { articleId: id };

      await handler(event);
      sinon.assert.calledWith(stubGetArticle, id, appId, {});
      sinon.assert.calledWith(
        stubSendNotifications,
        article.title,
        prepareNotif(article.plainText),
        appId,
        opts,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
