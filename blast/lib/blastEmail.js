/* eslint-disable import/no-relative-packages */
import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import { generateEmailHTML } from './emailUtils';

const { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM } = process.env;

const mailgun = Mailgun({
  apiKey: MAILGUN_API_KEY,
  domain: MAILGUN_DOMAIN,
});

export default ({ contact, template, subject, app }, cb) => {
  const mail = new MailComposer({
    subject,
    html: generateEmailHTML(template, contact, app),
    from: `${MAILGUN_FROM}@${MAILGUN_DOMAIN}`,
    to: contact.email,
  });
  return mail.compile().build((error, message) => {
    if (error) return cb(error);
    const dataToSend = {
      message: message.toString('ascii'),
      to: contact.email,
    };
    return mailgun.messages().sendMime(dataToSend, cb);
  });
};
