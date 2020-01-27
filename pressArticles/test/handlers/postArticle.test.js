import fs from 'fs';
import sinon from 'sinon';
import util from 'util';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import * as checkPerms from '../../../libs/perms/checkPerms';
import * as doSendNotifications from '../../lib/sendNotifications';
import * as getArticle from '../../lib/getArticle';
import * as lib from '../../lib/postArticle';
import * as publishArticle from '../../lib/publishArticle';

import defaultSettings from '../../lib/xmlParsing/settings/default.json';
import getInfos from '../../lib/xmlParsing/getInfos';
import handler from '../../handlers/postArticle';
import prepareNotif from '../../lib/prepareNotifString';
import xmlToHtml from '../../lib/xmlParsing/xmlToHtml';
import xmlToText from '../../lib/xmlParsing/xmlToText';

const readFile = (fileName) => util.promisify(fs.readFile)(`${__dirname}/../xml/${fileName}.xml`, 'utf8');

describe('handlers - postArticle', () => {
  let stubLib;
  let stubPerms;
  let stubPublishArticle;
  let stubDoSendNotifications;
  let stubGetArticle;

  const defaultBody = JSON.stringify({
    categoryId: 'categoryId',
    title: 'title',
    summary: 'summary',
    md: 'md',
    xml: 'xml',
    pictures: 'pictures',
  });

  const defaultStringParameters = {
    forceCategoryId: false,
    forcePictures: false,
    autoPublish: false,
    sendNotifications: false,
  };

  const event = {
    headers: ['content-type'],
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
    queryStringParameters: defaultStringParameters,
    body: defaultBody,
  };
  const sandbox = sinon.createSandbox();

  describe('no perms', () => {
    before(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(false);
      stubLib = sandbox.stub(lib, 'postArticle').returns(true);
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

  describe('lib success - json application', () => {
    const postArticleResult = {
      articleId: 'articleId',
      draftId: 'draftId',
    };

    before(() => {
      event.headers['content-type'] = 'application/json';
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'postArticle').returns(postArticleResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.deep.eq(postArticleResult);
    });

    it('lib should called with the goods args', () => {
      const {
        categoryId,
        title,
        summary,
        md,
        pictures,
      } = JSON.parse(event.body);
      const { principalId, appId } = event.requestContext.authorizer;
      const opt = {
        actions: [],
        feedPicture: undefined,
        appId,
        categoryId,
        html: '<p>md</p>',
        md,
        pictures,
        videos: undefined,
        plainText: 'md',
        summary,
        title,
        userId: principalId,
        xml: undefined,
      };
      sinon.assert.calledOnce(stubPerms);
      sinon.assert.calledWith(stubLib, opt);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib success - xml application', () => {
    const postArticleResult = {
      articleId: 'articleId',
      draftId: 'draftId',
    };

    before(async () => {
      event.body = await readFile('succeed');
      event.headers['content-type'] = 'application/xml';
      event.queryStringParameters = {
        forceCategoryId: 'forceCategoryId',
        forcePictures: JSON.stringify(['pictures']),
      };
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'postArticle').returns(postArticleResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.deep.eq(postArticleResult);
    });

    it('lib should called with the goods args', () => {
      const xml = event.body;
      const { principalId, appId } = event.requestContext.authorizer;
      const {
        forceCategoryId,
        forcePictures,
      } = event.queryStringParameters;
      const infos = getInfos(xml, defaultSettings);
      const title = infos.title || infos.name;
      const html = xmlToHtml(xml, defaultSettings);
      const plainText = xmlToText(xml, defaultSettings);

      const opt = {
        actions: [],
        feedPicture: undefined,
        userId: principalId,
        appId,
        categoryId: forceCategoryId,
        title,
        summary: ' ',
        html,
        md: undefined,
        xml,
        videos: undefined,
        pictures: JSON.parse(forcePictures),
        plainText,
      };
      sinon.assert.calledWith(stubLib, opt);
    });

    after(() => {
      event.headers['content-type'] = 'application/json';
      event.body = defaultBody;
      event.queryStringParameters = defaultStringParameters;
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const postArticleResult = new Error('lib method fail');

    beforeEach(() => {
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'postArticle').callsFake(() => Promise.reject(postArticleResult));
    });

    afterEach(() => {
      event.headers['content-type'] = 'application/json';
      event.body = defaultBody;
      sandbox.restore();
    });

    it('should return 500', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    it('error missing_payload', async () => {
      event.body = undefined;
      const response = await handler(event);
      expect(JSON.parse(response.body).message).to.eq('missing_payload');
      expect(response.statusCode).to.eq(500);
    });

    it('error mal_formed_request', async () => {
      const parseBody = JSON.parse(defaultBody);
      parseBody.categoryId = undefined;
      event.body = JSON.stringify(parseBody);

      const response = await handler(event);
      expect(JSON.parse(response.body).message).to.eq('mal_formed_request');
      expect(response.statusCode).to.eq(500);
    });

    it('error unhandled_content_type', async () => {
      event.body = defaultBody;
      event.headers['content-type'] = undefined;
      const response = await handler(event);
      expect(JSON.parse(response.body).message).to.eq('unhandled_content_type');
      expect(response.statusCode).to.eq(500);
    });
  });

  describe('publish', () => {
    const postArticleResult = {
      articleId: 'articleId',
      draftId: 'draftId',
    };
    const publishResult = {};

    before(() => {
      event.queryStringParameters.autoPublish = 'true';
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubLib = sandbox.stub(lib, 'postArticle').returns(postArticleResult);
      stubPublishArticle = sandbox.stub(publishArticle, 'publishArticle').returns(publishResult);
    });

    it('publishArticle should call with the good args', async () => {
      const { appId, principalId } = event.requestContext.authorizer;
      const { articleId, draftId } = postArticleResult;

      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.deep.eq({ published: true });
      sinon.assert.calledWith(stubPublishArticle, principalId, articleId, draftId, appId);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('send notification', () => {
    const postArticleResult = {
      title: 'title',
      articleId: 'articleId',
      draftId: 'draftId',
    };
    const publishArticleResult = {
      articleId: 'articleId',
    };
    const getArticleResult = {
      title: 'title',
      plainText: 'plainText',
      articleId: 'articleId',
    };

    before(() => {
      event.queryStringParameters.autoPublish = 'true';
      event.queryStringParameters.sendNotifications = 'true';
      stubPerms = sandbox.stub(checkPerms, 'checkPerms').returns(true);
      stubDoSendNotifications = sandbox.stub(doSendNotifications, 'doSendNotifications').returns(true);
      stubLib = sandbox.stub(lib, 'postArticle').returns(postArticleResult);
      stubPublishArticle = sandbox.stub(publishArticle, 'publishArticle').returns(publishArticleResult);
      stubGetArticle = sandbox.stub(getArticle, 'getArticle').returns(getArticleResult);
    });

    it('should send notifications', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body).notificationSent).to.eq(true);
    });

    it('publishArticle called with good args', () => {
      const { appId, principalId } = event.requestContext.authorizer;
      const { articleId, draftId } = postArticleResult;
      sinon.assert.calledWith(
        stubPublishArticle,
        principalId,
        articleId,
        draftId,
        appId,
      );
    });

    it('getArticle called with good args', () => {
      sinon.assert.calledWith(stubGetArticle, publishArticleResult.articleId, {});
    });

    it('doSendNotification called with good args', () => {
      const { appId } = event.requestContext.authorizer;
      const { articleId } = postArticleResult;
      const { plainText, title } = getArticleResult;

      sinon.assert.calledWith(
        stubDoSendNotifications,
        title,
        prepareNotif(plainText),
        appId,
        { articleId },
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
