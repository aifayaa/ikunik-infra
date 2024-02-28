/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import * as getArticle from '../../lib/getArticle';
import * as snsNotifications from '../../lib/snsNotifications';
import * as notificationsQueue from '../../lib/notificationsQueue';
import * as checkPerms from '../../../libs/perms/checkPerms';
import * as lib from '../../lib/publishArticle';
import handler from '../../handlers/publishArticle';
import prepareNotif from '../../lib/prepareNotifString';

describe('handlers - publishArticle', () => {
  let stubLib;
  let stubPerms;
  let stubSendNotificationsTo;
  /* let stubQueueArticleNotifications; */
  /* let stubCleanPendingArticleNotifications; */
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
      date: '2019-07-08T05:29:56.032Z',
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
    const libResult = { message: 'ok' };

    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'publishArticle').returns(libResult);
      /* stubCleanPendingArticleNotifications = */ sandbox
        .stub(notificationsQueue, 'cleanPendingArticleNotifications')
        .returns(true);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql({ results: libResult });
    });

    // TODO: FIX TEST (Prints an exception)
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
        new Date(eventParsed.date)
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
      stubLib = sandbox
        .stub(lib, 'publishArticle')
        .callsFake(() => Promise.reject(libResult));
      /* stubCleanPendingArticleNotifications = */ sandbox
        .stub(notificationsQueue, 'cleanPendingArticleNotifications')
        .returns(true);
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
        date: undefined,
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
        date: '2019-07-08T05:29:56.032Z',
        sendNotifications: true,
      });
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubGetArticle = sandbox.stub(getArticle, 'getArticle').returns(article);
      stubSendNotificationsTo = sandbox
        .stub(snsNotifications, 'sendNotificationTo')
        .returns(true);
      /* stubQueueArticleNotifications = */ sandbox
        .stub(notificationsQueue, 'queueArticleNotifications')
        .returns(true);
      /* stubCleanPendingArticleNotifications = */ sandbox
        .stub(notificationsQueue, 'cleanPendingArticleNotifications')
        .returns(true);
      stubLib = sandbox.stub(lib, 'publishArticle').returns(true);
    });

    // TODO: FIX TEST (Notifications changes)
    it.skip('should send notifications', async () => {
      const { appId } = event.requestContext.authorizer;
      const { id } = event.pathParameters;
      const opts = { articleId: id };

      await handler(event);
      sinon.assert.calledWith(stubGetArticle, id, appId, {});
      sinon.assert.calledWith(
        stubSendNotificationsTo,
        article.title,
        prepareNotif(article.plainText),
        appId,
        opts
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
