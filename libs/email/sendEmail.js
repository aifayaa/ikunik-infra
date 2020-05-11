import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';

const {
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
  MAILGUN_FROM,
} = process.env;

const mailgun = Mailgun({
  apiKey: MAILGUN_API_KEY,
  domain: MAILGUN_DOMAIN,
});

export const sendEmail = async (subject, html, to) => {
  const mail = new MailComposer({
    subject,
    html,
    from: `${MAILGUN_FROM}@${MAILGUN_DOMAIN}`,
    to,
  });

  const mailBuild = new Promise((resolve, reject) => {
    mail.compile().build((error, message) => {
      if (error) return reject(error);
      return resolve(message);
    });
  });
  const message = await mailBuild;
  const dataToSend = {
    message: message.toString('ascii'),
    to,
  };
  return mailgun.messages().sendMime(dataToSend);
};
