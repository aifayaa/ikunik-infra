import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';

export default async ({ subject, body, to }) => {
  const mailgun = Mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });
  return new Promise((resolve, reject) => {
    const mail = new MailComposer({
      subject,
      html: body,
      from: `${process.env.MAILGUN_FROM}@${process.env.MAILGUN_DOMAIN}`,
      to,
    });
    mail.compile().build((error, message) => {
      if (error) return reject(error);
      const dataToSend = {
        message: message.toString('ascii'),
        to,
      };
      return mailgun.messages().sendMime(dataToSend, (err) => {
        if (err) return reject(err);
        return resolve(true);
      });
    });
  });
};
