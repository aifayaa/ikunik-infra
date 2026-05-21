/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import { intlInit, formatMessage } from '../intl/intl';

const {
  SMTP_FROM,
  SMTP_LOGIN,
  SMTP_SERVER,
  SMTP_SECURE,
  SMTP_PASSWORD,
  EMAIL_SANDBOX_REDIRECT_TO,
} = process.env;
const EMAIL_SANDBOX_REDIRECT_SES_REGION =
  process.env.EMAIL_SANDBOX_REDIRECT_SES_REGION || 'eu-west-3';

let transport = null;
const ses = new AWS.SES({ region: EMAIL_SANDBOX_REDIRECT_SES_REGION });

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendSandboxRedirectedEmail({ to, subject, template, html }) {
  await ses
    .sendEmail({
      Source: EMAIL_SANDBOX_REDIRECT_TO,
      Destination: {
        ToAddresses: [EMAIL_SANDBOX_REDIRECT_TO],
      },
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: `[SANDBOX REDIRECT for ${to}] ${subject}`,
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `
              <p><b>Sandbox redirected email</b></p>
              <p>This email was <b>not sent to the original recipient</b>. It was redirected to the verified admin inbox below because SES is still in sandbox mode.</p>
              <p><b>Redirected to admin:</b> ${escapeHtml(
                EMAIL_SANDBOX_REDIRECT_TO
              )}</p>
              <p><b>Original recipient:</b> ${escapeHtml(to)}</p>
              <p><b>Original subject:</b> ${escapeHtml(subject)}</p>
              <p><b>Original template:</b> ${escapeHtml(template)}</p>
              <p><b>Action required:</b> review this message, then manually forward the relevant link/credentials/instructions to the original recipient.</p>
              <hr>
              ${html}
            `,
          },
        },
      },
    })
    .promise();

  return { sandboxRedirected: true, originalTo: to };
}

export const sendEmailTemplate = async (
  lang,
  template,
  to,
  subject,
  content
) => {
  intlInit(lang);

  if (['clients', 'customers', 'internal'].indexOf(template) < 0) {
    throw new Error('Invalid template argument to sendEmail()');
  }

  const html = formatMessage('libsEmail:template_skeleton', {
    body: `$t(libsEmail:template_${template})`,
    content,
  });

  if (EMAIL_SANDBOX_REDIRECT_TO) {
    return sendSandboxRedirectedEmail({ to, subject, template, html });
  }

  if (!transport) {
    transport = nodemailer.createTransport({
      host: SMTP_SERVER.split(':')[0],
      port: SMTP_SERVER.split(':')[1] | 0,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_LOGIN,
        pass: SMTP_PASSWORD,
      },
    });
  }

  const response = await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
  });

  return response;
};
