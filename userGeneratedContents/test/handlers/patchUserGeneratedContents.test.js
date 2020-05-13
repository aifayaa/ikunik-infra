import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as checkOwner from '../../../libs/perms/checkOwner';
import * as emailUgcNotifyTemplate from '../../lib/emailUgcNotifyTemplate';
import * as lib from '../../lib/patchUserGeneratedContents';
import * as sendEmailToAdmin from '../../lib/sendEmailToAdmin';
import handler from '../../handlers/patchUserGeneratedContents';

describe('handlers - patchUserGeneratedContents', () => {
  let stubLib;
  let stubOwner;
  let stubSendEmail;
  let stubEmailTemplate;
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
    let response;
    before(async () => {
      stubOwner = sandbox.stub(checkOwner, 'default').returns({ code: 403, message: 'forbidden_user' });
      stubEmailTemplate = sandbox.stub(emailUgcNotifyTemplate, 'default').returns({ subject: 'subject', body: 'body' });
      stubSendEmail = sandbox.stub(sendEmailToAdmin, 'default').returns(undefined);
      stubLib = sandbox.stub(lib, 'default').returns(true);
      response = await handler(event);
    });

    it('should return 403', () => {
      expect(response.statusCode).to.eq(403);
      expect(JSON.parse(response.body).message).to.eq('forbidden_user');
    });

    it('should not call send email function', () => {
      expect(stubSendEmail.notCalled).to.be.true;
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('lib error', () => {
    describe('empty data', () => {
      let response;
      before(async () => {
        stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox.stub(emailUgcNotifyTemplate, 'default').returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox.stub(sendEmailToAdmin, 'default').returns(undefined);
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({ data: {} });
        response = await handler(finalEvent);
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

    describe('any', () => {
      let response;
      before(async () => {
        stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
        stubLib = sandbox.stub(lib, 'default').throws();
        stubEmailTemplate = sandbox.stub(emailUgcNotifyTemplate, 'default').returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox.stub(sendEmailToAdmin, 'default').returns(undefined);
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
      stubOwner = sandbox.stub(checkOwner, 'default').returns(true);
      stubLib = sandbox.stub(lib, 'default').returns(true);
      stubEmailTemplate = sandbox.stub(emailUgcNotifyTemplate, 'default').returns({ subject: 'subject', body: 'body' });
      stubSendEmail = sandbox.stub(sendEmailToAdmin, 'default').returns(undefined);
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

    it('should call emailTemplate with right args', () => {
      const {
        principalId: userId,
        appId,
      } = event.requestContext.authorizer;
      expect(stubEmailTemplate.calledOnce).to.be.true;
      sinon.assert.calledWith(
        stubEmailTemplate,
        userId,
        appId,
        { contentId: 'userGeneratedContentsId', data: 'test' },
        { isEdition: true },
      );
    });

    it('should call send email with right args', () => {
      const {
        appId,
      } = event.requestContext.authorizer;
      expect(stubSendEmail.calledOnce).to.be.true;
      sinon.assert.calledWith(
        stubSendEmail,
        'subject',
        'body',
        appId,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
