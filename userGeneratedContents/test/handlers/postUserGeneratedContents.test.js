/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as emailUgcNotifyTemplate from '../../lib/emailUgcNotifyTemplate';
import * as lib from '../../lib/postUserGeneratedContents';
import * as pathToCollection from '../../../libs/collections/pathToCollection';
import mongoCollections from '../../../libs/mongoCollections.json';
import * as sendEmailToAdmin from '../../lib/sendEmailToAdmin';
import handler from '../../handlers/postUserGeneratedContents';

describe('handlers - postUserGeneratedContents', () => {
  let stubLib;
  let stubPathToCollection;
  let stubSendEmail;
  let stubEmailTemplate;
  const event = {
    body: JSON.stringify({
      parentId: '66494021-bcbf-4eea-bf04-a666c44bda57',
      type: 'article',
      data: {
        title: 'title',
        content: 'content',
        pictures: ['pictureId'],
      },
    }),
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
      resourcePath: '',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('any', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').throws();
        stubPathToCollection = sandbox
          .stub(pathToCollection, 'default')
          .returns(mongoCollections.COLL_USER_GENERATED_CONTENTS);
        stubEmailTemplate = sandbox
          .stub(emailUgcNotifyTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        response = await handler(event);
      });

      it('should return 500', () => {
        expect(response.statusCode).to.equal(500);
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });
  });

  describe('success', () => {
    let response;

    before(async () => {
      stubLib = sandbox
        .stub(lib, 'default')
        .returns({ _id: 'userGeneratedContentsId' });
      stubPathToCollection = sandbox
        .stub(pathToCollection, 'default')
        .returns(mongoCollections.COLL_USER_GENERATED_CONTENTS);
      stubEmailTemplate = sandbox
        .stub(emailUgcNotifyTemplate, 'default')
        .returns({ subject: 'subject', body: 'body' });
      stubSendEmail = sandbox
        .stub(sendEmailToAdmin, 'default')
        .returns(undefined);
      response = await handler(event);
    });

    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should call lib with right args', () => {
      const { principalId, appId } = event.requestContext.authorizer;
      const bodyParsed = JSON.parse(event.body);
      const { parentId, type, data } = bodyParsed;
      const parentCollection = mongoCollections.COLL_USER_GENERATED_CONTENTS;
      const rootParentId = parentId;
      const rootParentCollection = parentCollection;

      sinon.assert.calledOnce(stubPathToCollection);
      sinon.assert.calledWith(
        stubLib,
        appId,
        parentId,
        parentCollection,
        rootParentId,
        rootParentCollection,
        principalId,
        type,
        data
      );
    });

    it('should call emailTemplate with right args', () => {
      const { principalId: userId, appId } = event.requestContext.authorizer;
      expect(stubEmailTemplate.calledOnce).to.be.true;
      sinon.assert.calledWith(stubEmailTemplate, userId, appId, {
        contentId: 'userGeneratedContentsId',
        data: {
          title: 'title',
          content: 'content',
          pictures: ['pictureId'],
        },
      });
    });

    it('should call send email with right args', () => {
      const { appId } = event.requestContext.authorizer;
      expect(stubSendEmail.calledOnce).to.be.true;
      sinon.assert.calledWith(stubSendEmail, 'subject', 'body', appId);
    });

    after(() => {
      sandbox.restore();
    });
  });
});
