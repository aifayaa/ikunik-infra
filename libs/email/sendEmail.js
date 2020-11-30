import nodemailer from 'nodemailer';
import { intlInit, formatMessage } from '../intl/intl';

const {
  SMTP_FROM,
  SMTP_LOGIN,
  SMTP_SERVER,
  SMTP_SECURE,
  SMTP_PASSWORD,
} = process.env;

let transport = null;

export const sendEmail = async (subject, html, to) => {
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

  return (response);
};

export const sendEmailTemplate = async (lang, template, to, subject, content) => {
  intlInit(lang);

  if (['clients', 'customers'].indexOf(template) < 0) {
    throw new Error('Invalid template argument to sendEmail()');
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

  const html = formatMessage(`libsEmail:template_${template}`, { content });
  const response = await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
  });

  return (response);
};
