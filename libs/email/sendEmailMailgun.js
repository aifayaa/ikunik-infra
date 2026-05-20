/* eslint-disable import/no-relative-packages */
import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import { sendEmailTemplate } from './sendEmail';

const { MAILGUN_API_KEY, MAILGUN_DOMAIN, EMAIL_SANDBOX_REDIRECT_TO } =
  process.env;

const mailgun = Mailgun({
  apiKey: MAILGUN_API_KEY,
  domain: MAILGUN_DOMAIN,
});

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRedirectedHtml({
  originalTo,
  redirectTo,
  subject,
  template,
  vars = {},
  body = null,
}) {
  const varsHtml = Object.keys(vars)
    .sort()
    .map(
      (key) => `<li><b>${escapeHtml(key)}</b>: ${escapeHtml(vars[key])}</li>`
    )
    .join('');

  return `
    <p><b>Sandbox redirected email</b></p>
    <p>This email was <b>not sent to the original recipient</b>. It was redirected to the verified admin inbox below because SES is still in sandbox mode.</p>
    <p><b>Redirected to admin:</b> ${escapeHtml(redirectTo)}</p>
    <p><b>Original recipient:</b> ${escapeHtml(originalTo)}</p>
    <p><b>Original subject:</b> ${escapeHtml(subject)}</p>
    <p><b>Original Mailgun template:</b> ${escapeHtml(template || 'html')}</p>
    <p><b>Action required:</b> review this message, then manually forward the relevant invitation/credentials to the original recipient.</p>
    ${varsHtml ? `<ul>${varsHtml}</ul>` : ''}
    ${body ? `<hr>${body}` : ''}
  `;
}

async function sendSandboxRedirect({
  originalTo,
  subject,
  template,
  vars,
  body,
}) {
  if (!EMAIL_SANDBOX_REDIRECT_TO) {
    return false;
  }

  await sendEmailTemplate(
    'en',
    'internal',
    EMAIL_SANDBOX_REDIRECT_TO,
    `[SANDBOX REDIRECT for ${originalTo}] ${subject}`,
    buildRedirectedHtml({
      originalTo,
      redirectTo: EMAIL_SANDBOX_REDIRECT_TO,
      subject,
      template,
      vars,
      body,
    })
  );

  return true;
}

function isDisabledOrForbiddenMailgunError(error) {
  const message = `${error && error.message ? error.message : error}`;
  const statusCode = error && (error.statusCode || error.status);
  return (
    statusCode === 401 ||
    statusCode === 403 ||
    /disabled|forbidden|unauthorized/i.test(message)
  );
}

export function sendEmailMailgunTemplate(
  from,
  to,
  subject,
  template,
  vars = {},
  extra = {}
) {
  const mappedVars = Object.keys(vars).reduce((acc, key) => {
    acc[`v:${key}`] = vars[key];
    return acc;
  }, {});

  return new Promise((resolve, reject) => {
    const data = {
      from,
      to,
      subject,
      template,
      ...mappedVars,
      ...extra,
    };
    mailgun.messages().send(data, (error, body) => {
      if (error) reject(error);
      else resolve(body);
    });
  }).catch(async (error) => {
    if (!isDisabledOrForbiddenMailgunError(error)) {
      throw error;
    }
    const redirected = await sendSandboxRedirect({
      originalTo: to,
      subject,
      template,
      vars,
    });
    if (redirected) {
      return { sandboxRedirected: true, originalTo: to };
    }
    throw error;
  });
}

export function sendEmailMailgunHtml(from, to, subject, body, extra = {}) {
  return new Promise((resolve, reject) => {
    const mail = new MailComposer({
      subject,
      html: body,
      from,
      to,
      ...extra,
    });

    mail.compile().build((error, message) => {
      if (error) {
        reject(error);
        return;
      }

      const dataToSend = {
        message: message.toString('ascii'),
        to,
      };

      mailgun.messages().sendMime(dataToSend, (err) => {
        if (err) return reject(err);
        return resolve(true);
      });
    });
  }).catch(async (error) => {
    if (!isDisabledOrForbiddenMailgunError(error)) {
      throw error;
    }
    const redirected = await sendSandboxRedirect({
      originalTo: to,
      subject,
      body,
    });
    if (redirected) {
      return { sandboxRedirected: true, originalTo: to };
    }
    throw error;
  });
}
