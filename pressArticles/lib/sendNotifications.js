import { MongoClient } from 'mongodb';
import queue from 'async/queue';
import SNS from 'aws-sdk/clients/sns';

const sns = new SNS({
  region: process.env.SNS_REGION,
  credentials: {
    accessKeyId: process.env.SNS_KEY_ID,
    secretAccessKey: process.env.SNS_SECRET,
  },
});

const doBlastNotification = ({ title, message, endpoint, extraData = {} }, cb) => {
  const msg = {};
  msg.default = '';
  if (endpoint.Platform === 'APNS') {
    msg[endpoint.Platform] = JSON.stringify({
      aps: {
        alert: `${title}: ${message}`,
        ...extraData,
      },
    });
  } else {
    msg[endpoint.Platform] = JSON.stringify({
      data: {
        message,
        title,
        ...extraData,
      },
    });
  }
  const params = {
    Message: JSON.stringify(msg),
    MessageStructure: 'json',
    TargetArn: endpoint.EndpointArn,
  };
  return sns.publish(params, cb);
};

export default async (title, message, customer, extraData) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const endpoints = await client
      .db(process.env.DB_NAME)
      .collection('pushNotifications')
      .find(
        { clients: { $elemMatch: { $eq: customer } } },
        { projection: { _id: 1, Platform: 1, EndpointArn: 1 } },
      ).toArray();
    const sendNotifications = queue(doBlastNotification, 50);
    const results = [];
    let successful = 0;
    const sendNotificationsDone = new Promise((resolve) => {
      sendNotifications.drain = () => {
        resolve();
      };
    });

    endpoints.forEach((endpoint) => {
      sendNotifications.push({ title, message, endpoint, extraData }, (error, res) => {
        if (!error) successful += 1;
        results.push(error || res);
      });
    });
    await sendNotificationsDone;
    return { successful };
  } finally {
    client.close();
  }
};
