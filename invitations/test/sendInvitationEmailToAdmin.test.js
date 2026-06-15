/* eslint-disable import/no-extraneous-dependencies, import/no-relative-packages */
/* eslint-env mocha */
import assert from 'assert';
import AWS from 'aws-sdk';
import {
  buildInvitationAdminEmailHtml,
  resetSesClientForTests,
  sendInvitationEmailToAdmin,
} from '../lib/sendInvitationEmailToAdmin';

describe('sendInvitationEmailToAdmin', () => {
  let originalSendEmail;
  let sendEmailCalls;

  beforeEach(() => {
    process.env.EMAIL_SANDBOX_REDIRECT_TO = 'JimmyT@ikunikteklab.com';
    process.env.EMAIL_SANDBOX_REDIRECT_SES_REGION = 'eu-west-3';
    sendEmailCalls = [];
    originalSendEmail = AWS.SES.prototype.sendEmail;
    AWS.SES.prototype.sendEmail = function sendEmail(params) {
      sendEmailCalls.push({ region: this.config.region, params });
      return {
        promise: () => Promise.resolve({ MessageId: 'ses-message-id' }),
      };
    };
    resetSesClientForTests();
  });

  afterEach(() => {
    AWS.SES.prototype.sendEmail = originalSendEmail;
    delete process.env.EMAIL_SANDBOX_REDIRECT_TO;
    delete process.env.EMAIL_SANDBOX_REDIRECT_SES_REGION;
    resetSesClientForTests();
  });

  it('sends the invitation only to the verified admin inbox', async () => {
    const result = await sendInvitationEmailToAdmin({
      originalTo: 'client@example.com',
      subject: 'Join the organization',
      template: 'send_invitation_to_join_organization_en',
      vars: {
        organizationName: 'Dweblife Sports Assistant',
        url: 'https://dashboard.example/invitations/id?challengeCode=hidden',
      },
      context: {
        invitationId: 'invitation-id',
        notificationType: 'created',
        target: {
          type: 'organization',
          organizationId: 'organization-id',
          role: 'admin',
        },
      },
    });

    assert.strictEqual(sendEmailCalls.length, 1);
    assert.strictEqual(sendEmailCalls[0].region, 'eu-west-3');
    assert.strictEqual(
      sendEmailCalls[0].params.Source,
      'JimmyT@ikunikteklab.com'
    );
    assert.deepStrictEqual(sendEmailCalls[0].params.Destination.ToAddresses, [
      'JimmyT@ikunikteklab.com',
    ]);
    assert.match(
      sendEmailCalls[0].params.Message.Subject.Data,
      /\[SANDBOX REDIRECT for client@example\.com\]/
    );
    assert.strictEqual(result.status, 'redirected_to_admin');
    assert.strictEqual(result.originalTo, 'client@example.com');
    assert.strictEqual(result.redirectTo, 'JimmyT@ikunikteklab.com');
  });

  it('requires a configured redirect inbox', async () => {
    delete process.env.EMAIL_SANDBOX_REDIRECT_TO;

    await assert.rejects(
      () =>
        sendInvitationEmailToAdmin({
          originalTo: 'client@example.com',
          subject: 'Join',
          template: 'template',
        }),
      /EMAIL_SANDBOX_REDIRECT_TO is required/
    );
    assert.strictEqual(sendEmailCalls.length, 0);
  });

  it('renders original recipient and template variables', () => {
    const html = buildInvitationAdminEmailHtml({
      originalTo: 'client@example.com',
      redirectTo: 'JimmyT@ikunikteklab.com',
      subject: 'Join',
      template: 'template',
      vars: {
        organizationName: 'Dweblife Sports Assistant',
        url: 'https://dashboard.example/invitations/id',
      },
    });

    assert.match(html, /Original recipient:/);
    assert.match(html, /client@example\.com/);
    assert.match(html, /Dweblife Sports Assistant/);
    assert.match(html, /https:\/\/dashboard\.example\/invitations\/id/);
  });
});
