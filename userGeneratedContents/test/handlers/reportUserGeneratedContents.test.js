/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as emailTemplate from '../../lib/emailUgcReportTemplate';
import * as lib from '../../lib/reportUserGeneratedContents';
import * as sendEmailToAdmin from '../../lib/sendEmailToAdmin';
import handler from '../../handlers/reportUserGeneratedContents';

describe('handlers - reportUserGeneratedContents', () => {
  let stubLib;
  let stubSendEmail;
  let stubEmailTemplate;
  const event = {
    body: JSON.stringify({
      details: 'details',
      reason: 'inappropriate',
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

  describe('lib error', () => {
    describe('missing_payload', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        const finalEvent = { ...event };
        finalEvent.body = null;
        response = await handler(finalEvent);
      });

      it('should return 400', () => {
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('missing_payload');
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('missing_arguments', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({});
        response = await handler(finalEvent);
      });

      it('should return 400', () => {
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('missing_arguments');
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('wrong_argument_type reason', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({ reason: 1, details: 'details' });
        response = await handler(finalEvent);
      });

      it('should return 400', () => {
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('wrong_argument_type');
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('wrong_argument_type details', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({
          reason: 'inappropriate',
          details: 1,
        });
        response = await handler(finalEvent);
      });

      it('should return 400', () => {
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('wrong_argument_type');
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('unavailable_reason', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({
          reason: 'reason',
          details: 'details',
        });
        response = await handler(finalEvent);
      });

      it('should return 400', () => {
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('unavailable_reason');
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('ugc_not_found', () => {
      let response;
      before(async () => {
        stubLib = sandbox
          .stub(lib, 'default')
          .throws(new Error('ugc_not_found'));
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        response = await handler(event);
      });

      it('should return 404', () => {
        expect(response.statusCode).to.equal(404);
        expect(JSON.parse(response.body).message).to.eq('ugc_not_found');
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
        stubLib = sandbox.stub(lib, 'default').throws();
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
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
    describe('email template failled', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox.stub(emailTemplate, 'default').throws();
        stubSendEmail = sandbox
          .stub(sendEmailToAdmin, 'default')
          .returns(undefined);
        response = await handler(event);
      });

      it('should return 200', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('should not call send email function', () => {
        expect(stubSendEmail.notCalled).to.be.true;
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('send Email failled', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
          .returns({ subject: 'subject', body: 'body' });
        stubSendEmail = sandbox.stub(sendEmailToAdmin, 'default').throws();
        response = await handler(event);
      });

      it('should return 200', () => {
        expect(response.statusCode).to.equal(200);
      });

      after(() => {
        sandbox.restore();
      });
    });
    describe('all ok', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        stubEmailTemplate = sandbox
          .stub(emailTemplate, 'default')
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
        const { id } = event.pathParameters;
        const { principalId, appId } = event.requestContext.authorizer;
        const bodyParsed = JSON.parse(event.body);
        const { details, reason } = bodyParsed;

        sinon.assert.calledWith(
          stubLib,
          appId,
          principalId,
          id,
          reason,
          details
        );
      });

      it('should call emailTemplate with right args', () => {
        const { principalId: userId, appId } = event.requestContext.authorizer;
        expect(stubEmailTemplate.calledOnce).to.be.true;
        sinon.assert.calledWith(
          stubEmailTemplate,
          userId,
          appId,
          'userGeneratedContentsId',
          'inappropriate',
          'details'
        );
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
});
