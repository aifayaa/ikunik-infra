import crypto from 'crypto';
import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import phone from 'phone';
import queue from 'async/queue';
import SNS from 'aws-sdk/clients/sns';

import { generateEmailHTML } from './emailUtils';

const mailgun = Mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const sns = new SNS({
  region: process.env.SNS_REGION,
  credentials: {
    accessKeyId: process.env.SNS_ACCESS_KEY_ID,
    secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
  },
});

const AWSId = () => [8, 4, 4, 4, 8].map(crypto.randomBytes).map(id => id.toString('hex')).join('-');

const doBlastEmail = ({ contact, template, subject }, cb) => {
  const mail = new MailComposer({
    subject,
    html: generateEmailHTML(template, contact),
    from: `${process.env.FROM}@${process.env.MAILGUN_DOMAIN}`,
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

const doBlastNotification = ({ artistName, endpoint, message }, cb) => {
  const msg = {};
  msg.default = '';
  if (endpoint.Platform === 'APNS') {
    msg[endpoint.Platform] = JSON.stringify({
      aps: {
        alert: `${artistName}: ${message}`,
      },
    });
  } else {
    msg[endpoint.Platform] = JSON.stringify({
      data: {
        message,
        title: `Message from ${artistName}`,
      },
    });
  }
  const params = {
    Message: JSON.stringify(msg),
    MessageStructure: 'json',
    TargetArn: endpoint.EndpointArn,
  };
  if (process.env.STAGE === 'prod') return sns.publish(params, cb);
  return cb(null, {
    ResponseMetadata: {
      RequestId: AWSId(),
      MessageId: AWSId(),
    },
  });
};

const doBlastText = ({ message, phoneNumber }, cb) => {
  const params = {
    Message: message,
    MessageStructure: 'string',
    PhoneNumber: phone(phoneNumber)[0],
  };
  if (process.env.STAGE === 'prod') return sns.publish(params, cb);
  return cb(null, {
    ResponseMetadata: {
      RequestId: AWSId(),
      MessageId: AWSId(),
    },
  });
};

export const handleBlastEmail = async ({
  contacts,
  subject,
  template,
}, context, callback) => {
  try {
    console.log({ contacts, subject, template });
    const sendEmails = queue(doBlastEmail, 20);
    const results = [];
    sendEmails.drain = () => {
      const body = JSON.stringify(results);
      console.log(body);
      const response = {
        body,
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      };
      callback(null, response);
    };
    contacts.forEach((contact) => {
      sendEmails.push({ contact, template, subject }, (error, res) => {
        results.push(error || res);
      });
    });
  } catch (e) {
    console.log(e.message);
    const response = {
      body: e.message,
      statusCode: 500,
    };
    callback(null, response);
  }
};

export const handleBlastNotification = async ({ artistName, endpoints, message }, context
  , callback) => {
  try {
    console.log({ artistName, endpoints, message });
    const sendNotifications = queue(doBlastNotification, 50);
    const results = [];
    sendNotifications.drain = () => {
      const body = JSON.stringify(results);
      console.log(body);
      const response = {
        body,
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      };
      callback(null, response);
    };
    endpoints.forEach((endpoint) => {
      sendNotifications.push({ artistName, endpoint, message }, (error, res) => {
        results.push(error || res);
      });
    });
  } catch (e) {
    console.log(e.message);
    const response = {
      body: e.message,
      statusCode: 500,
    };
    callback(null, response);
  }
};

export const handleBlastText = async ({ phones, message }, context, callback) => {
  try {
    console.log({ phones, message });
    const sendTexts = queue(doBlastText, 50);
    const results = [];
    sendTexts.drain = () => {
      const body = JSON.stringify(results);
      console.log(body);
      const response = {
        body,
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      };
      callback(null, response);
    };
    phones.forEach((phoneNumber) => {
      sendTexts.push({ message, phoneNumber }, (error, res) => {
        results.push(error || res);
      });
    });
  } catch (e) {
    console.log(e.message);
    const response = {
      body: e.message,
      statusCode: 500,
    };
    callback(null, response);
  }
};
