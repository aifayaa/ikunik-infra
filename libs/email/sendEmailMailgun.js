import Mailgun from 'mailgun-js';

const {
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
} = process.env;

const mailgun = Mailgun({
  apiKey: MAILGUN_API_KEY,
  domain: MAILGUN_DOMAIN,
});

export function sendEmailMailgunTemplate(from, to, subject, template, vars = {}, extra = {}) {
  const mappedVars = Object.keys(vars).reduce((acc, key) => {
    acc[`v:${key}`] = vars[key];
    return (acc);
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
  });
}
