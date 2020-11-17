import nodemailer from 'nodemailer';

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
