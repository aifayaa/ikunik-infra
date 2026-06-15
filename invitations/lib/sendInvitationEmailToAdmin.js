/* eslint-disable import/no-extraneous-dependencies, import/no-relative-packages, no-console */
import AWS from 'aws-sdk';

const DEFAULT_REDIRECT_SES_REGION = 'eu-west-3';

let sesClient = null;
let sesClientRegion = null;

function getRedirectTo() {
  return process.env.EMAIL_SANDBOX_REDIRECT_TO;
}

function getSesRegion() {
  return (
    process.env.EMAIL_SANDBOX_REDIRECT_SES_REGION || DEFAULT_REDIRECT_SES_REGION
  );
}

function getSesClient() {
  const region = getSesRegion();
  if (!sesClient || sesClientRegion !== region) {
    sesClient = new AWS.SES({ region });
    sesClientRegion = region;
  }
  return sesClient;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildVarsHtml(vars = {}) {
  return Object.keys(vars)
    .sort()
    .map((key) => {
      const value = vars[key];
      const renderedValue =
        typeof value === 'string' && /^https?:\/\//.test(value)
          ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`
          : escapeHtml(value);
      return `<li><b>${escapeHtml(key)}</b>: ${renderedValue}</li>`;
    })
    .join('');
}

export function buildInvitationAdminEmailHtml({
  originalTo,
  redirectTo,
  subject,
  template,
  vars = {},
}) {
  const varsHtml = buildVarsHtml(vars);

  return `
    <p><b>Invitation email redirected to admin</b></p>
    <p>This invitation was <b>not sent to the original recipient</b>. It was sent directly to the verified admin inbox below for manual forwarding.</p>
    <p><b>Redirected to admin:</b> ${escapeHtml(redirectTo)}</p>
    <p><b>Original recipient:</b> ${escapeHtml(originalTo)}</p>
    <p><b>Original subject:</b> ${escapeHtml(subject)}</p>
    <p><b>Original template:</b> ${escapeHtml(template)}</p>
    <p><b>Action required:</b> review this message, then manually forward the relevant invitation link and context to the original recipient.</p>
    ${varsHtml ? `<ul>${varsHtml}</ul>` : ''}
  `;
}

function getLogPayload({ result, context }) {
  const target = context && context.target ? context.target : {};
  return {
    event: 'invitation_email_redirected_to_admin',
    provider: 'ses',
    invitationId: context && context.invitationId,
    notificationType: context && context.notificationType,
    originalTo: result.originalTo,
    redirectTo: result.redirectTo,
    messageId: result.messageId,
    sentAt: result.sentAt,
    template: result.template,
    targetType: target.type,
    organizationId: target.organizationId,
    role: target.role,
  };
}

export async function sendInvitationEmailToAdmin({
  originalTo,
  subject,
  template,
  vars = {},
  context = {},
}) {
  const redirectTo = getRedirectTo();
  if (!redirectTo) {
    throw new Error('EMAIL_SANDBOX_REDIRECT_TO is required for invitations');
  }

  try {
    const response = await getSesClient()
      .sendEmail({
        Source: redirectTo,
        Destination: {
          ToAddresses: [redirectTo],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: `[SANDBOX REDIRECT for ${originalTo}] ${subject}`,
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: buildInvitationAdminEmailHtml({
                originalTo,
                redirectTo,
                subject,
                template,
                vars,
              }),
            },
          },
        },
      })
      .promise();

    const result = {
      provider: 'ses',
      status: 'redirected_to_admin',
      originalTo,
      redirectTo,
      sentAt: new Date().toISOString(),
      messageId: response && response.MessageId,
      template,
    };

    // CloudWatch audit marker. Do not include challengeCode or raw URL here.
    console.log(JSON.stringify(getLogPayload({ result, context })));

    return result;
  } catch (error) {
    const target = context && context.target ? context.target : {};
    console.error(
      JSON.stringify({
        event: 'invitation_email_redirect_to_admin_failed',
        provider: 'ses',
        invitationId: context && context.invitationId,
        notificationType: context && context.notificationType,
        originalTo,
        redirectTo,
        template,
        targetType: target.type,
        organizationId: target.organizationId,
        role: target.role,
        errorCode: error && (error.code || error.statusCode || error.name),
        errorMessage: error && error.message,
      })
    );
    throw error;
  }
}

export function resetSesClientForTests() {
  sesClient = null;
  sesClientRegion = null;
}
