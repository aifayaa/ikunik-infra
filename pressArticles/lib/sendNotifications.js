import { MongoClient } from 'mongodb';
import queue from 'async/queue';
import AWS from 'aws-sdk';

const {
  COLL_PUSH_NOTIFICATIONS,
  DB_NAME,
  MONGO_URL,
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
} = process.env;

const doBlastNotification = ({ title, message, endpoint, extraData = {} }, cb) => {
  const sns = new AWS.SNS({
    region: SNS_REGION,
    credentials: {
      accessKeyId: SNS_KEY_ID,
      secretAccessKey: SNS_SECRET,
    },
  });
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

export const doSendNotifications = async (title, message, appId, extraData) => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const endpoints = await client
      .db(DB_NAME)
      .collection(COLL_PUSH_NOTIFICATIONS)
      .find(
        { appId },
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
