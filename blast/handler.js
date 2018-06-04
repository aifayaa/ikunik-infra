import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import Lambda from 'aws-sdk/clients/lambda';
import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import phone from 'phone';
import queue from 'async/queue';
import SNS from 'aws-sdk/clients/sns';
import validator from 'validator';

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

const lambda = new Lambda({
  region: process.env.LAMBDA_REGION,
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

const doRemoveBlastToken = async (type, profileId, qte) => {
  let client;
  let collName;
  switch (type) {
    case 'email':
      collName = 'artistEmailsBalance';
      break;
    case 'notification':
      collName = 'artistNotificationBalance';
      break;
    case 'text':
      collName = 'artistTextMessageBalance';
      break;
    default:
  }
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const res = await client.db(process.env.DB_NAME).collection(collName)
      .updateOne({ profil_ID: profileId }, {
        $inc: {
          balance: -Number(qte),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      console.log(`decrement ${profileId} of ${qte} ${type} tokens`);
      return true;
    }
    throw new Error('No profile found');
  } finally {
    client.close();
  }
};

export const handleRemoveBlastToken = async ({ type, userId, qte }, context, callback) => {
  try {
    if (!userId) throw new Error('missing user');
    if (!validator.isInt(qte, { min: 0, allow_leading_zeroes: false })) {
      throw new Error('wrong quantity');
    }

    if (!validator.isIn(type, ['email', 'notification', 'text'])) {
      throw new Error('invalid type value');
    }
    const res = await lambda.invoke({
      FunctionName: `users-${process.env.STAGE}-getProfile`,
      Payload: JSON.stringify({
        pathParameters: { id: userId },
        requestContext: { authorizer: { principalId: userId } },
      }),
    }).promise();
    const { StatusCode, Payload } = res;
    if (StatusCode !== 200) throw new Error('failed to get profile');
    const { body } = JSON.parse(Payload);
    if (!body) throw new Error('wrong profile');
    const { _id } = JSON.parse(body);
    if (!_id) throw new Error('cannot get profile data from profile service');
    const results = await doRemoveBlastToken(type, _id, qte);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleBlastEmail = async ({
  contacts,
  subject,
  template,
  opts = {},
}, context, callback) => {
  try {
    console.log({ contacts, subject, template });
    const sendEmails = queue(doBlastEmail, 20);
    const results = [];
    let successfulBlast = 0;
    sendEmails.drain = () => {
      const body = JSON.stringify(results);
      console.log(body);
      const { userId } = opts;
      if (userId) {
        handleRemoveBlastToken({ type: 'email', userId, qte: `${successfulBlast}` }, null, () => {});
      }
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
        if (!error) successfulBlast += 1;
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

export const handleBlastNotification = async ({ artistName, endpoints, message, opts = {} }, context
  , callback) => {
  try {
    console.log({ artistName, endpoints, message });
    const sendNotifications = queue(doBlastNotification, 50);
    const results = [];
    let successfulBlast = 0;
    sendNotifications.drain = () => {
      const body = JSON.stringify(results);
      console.log(body);
      const { userId } = opts;
      if (userId) {
        handleRemoveBlastToken({ type: 'notification', userId, qte: `${successfulBlast}` }, null, () => {});
      }
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
        if (!error) successfulBlast += 1;
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

export const handleBlastText = async ({ phones, message, opts = {} }, context, callback) => {
  try {
    console.log({ phones, message });
    const sendTexts = queue(doBlastText, 50);
    const results = [];
    let successfulBlast = 0;
    sendTexts.drain = () => {
      const body = JSON.stringify(results);
      console.log(body);
      const { userId } = opts;
      if (userId) {
        handleRemoveBlastToken({ type: 'text', userId, qte: `${successfulBlast}` }, null, () => {});
      }
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
        if (!error) successfulBlast += 1;
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
