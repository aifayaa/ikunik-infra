import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';

export default async (mailObj) => {
  const mailgun = Mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });
  const { subject, body, to } = mailObj;
  return new Promise((resolve, reject) => {
    const mail = new MailComposer({
      subject,
      html: body,
      from: `${process.env.FROM}@${process.env.MAILGUN_DOMAIN}`,
      to,
    });
    mail.compile().build((error, message) => {
      if (error) return reject(error);
      const dataToSend = {
        message: message.toString('ascii'),
        to,
      };
      return mailgun.messages().sendMime(dataToSend, (err) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  });
};
