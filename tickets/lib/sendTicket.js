import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import wkhtmltopdf from 'wkhtmltopdf';

import '../wkhtmltopdf.dms';

console.log('+++++++++++', `${process.env.LAMBDA_TASK_ROOT}/wkhtmltopdf`);
wkhtmltopdf.command = `${process.env.LAMBDA_TASK_ROOT}/wkhtmltopdf`;

export default async ({ subject, body, to, attachementName, pdf }) => {
  const mailgun = Mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });
  return new Promise((resolve, reject) => {
    const mail = new MailComposer({
      subject,
      attachments: [{
        filename: attachementName,
        content: wkhtmltopdf(pdf, { pageSize: 'letter', encoding: 'utf8' }),
        contentType: 'application/pdf',
      }],
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
        if (err) return reject(err);
        return resolve(true);
      });
    });
  });
};
