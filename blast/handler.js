import crypto from 'crypto';
import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import SNS from 'aws-sdk/clients/sns';
import { prepare } from 'premailer-api';

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

export const handleBlastEmail = async ({
  contacts,
  subject,
  template,
}, context, callback) => {
  try {
    const sendEmails = contacts.map(contact => new Promise((resolve, reject) => {
      prepare({ html: generateEmailHTML(template, contact) }, (err, { html }) => {
        if (err) return reject(err);
        const mail = new MailComposer({
          subject,
          html,
          from: `${process.env.FROM}@${process.env.MAILGUN_DOMAIN}`,
          to: contact.email,
        });
        return mail.compile().build((error, message) => {
          if (error) return reject(error);
          const dataToSend = {
            message: message.toString('ascii'),
            to: contact.email,
          };
          return mailgun.messages().sendMime(dataToSend).then(resolve).catch(reject);
        });
      });
    }));
    const results = await Promise.all(sendEmails);
    const response = {
      body: JSON.stringify(results),
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
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
    const sendNotifications = endpoints.map((endpoint) => {
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
      if (process.env.STAGE === 'prod') return sns.publish(params).promise();
      return Promise.resolve({
        ResponseMetadata: {
          RequestId: AWSId(),
          MessageId: AWSId(),
        },
      });
    });
    const results = await Promise.all(sendNotifications);
    const response = {
      body: JSON.stringify(results),
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      body: e.message,
      statusCode: 500,
    };
    callback(null, response);
  }
};

export const handleBlastText = async ({ phones, message }, context, callback) => {
  try {
    const sendTexts = phones.map((phone) => {
      const params = {
        Message: message,
        MessageStructure: 'string',
        PhoneNumber: phone,
      };
      if (process.env.STAGE === 'prod') return sns.publish(params).promise();
      return Promise.resolve({
        ResponseMetadata: {
          RequestId: AWSId(),
          MessageId: AWSId(),
        },
      });
    });
    const results = await Promise.all(sendTexts);
    const response = {
      body: JSON.stringify(results),
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      body: e.message,
      statusCode: 500,
    };
    callback(null, response);
  }
};

export const handleGenerateEmail = async ({ phones, message }, context, callback) => {
  try {
    const sendTexts = phones.map((phone) => {
      const params = {
        Message: message,
        MessageStructure: 'string',
        PhoneNumber: phone,
      };
      if (process.env.STAGE === 'prod') return sns.publish(params).promise();
      return Promise.resolve({
        ResponseMetadata: {
          RequestId: AWSId(),
          MessageId: AWSId(),
        },
      });
    });
    const results = await Promise.all(sendTexts);
    const response = {
      body: JSON.stringify(results),
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      body: e.message,
      statusCode: 500,
    };
    callback(null, response);
  }
};
