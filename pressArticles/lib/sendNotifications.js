import AWS from 'aws-sdk';
import MongoClient from '../../libs/mongoClient';

const {
  COLL_PUSH_NOTIFICATIONS,
  DB_NAME,
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
} = process.env;

const doBlastNotification = ({ sns, title, message, endpoint, extraData = {} }, cb) => {
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
  const client = await MongoClient.connect();
  try {
    const endpoints = client
      .db(DB_NAME)
      .collection(COLL_PUSH_NOTIFICATIONS)
      .find(
        { appId },
        { projection: { _id: 1, Platform: 1, EndpointArn: 1 } },
      );
    const sns = new AWS.SNS({
      region: SNS_REGION,
      credentials: {
        accessKeyId: SNS_KEY_ID,
        secretAccessKey: SNS_SECRET,
      },
    });
    const promises = [];
    let successful = 0;
    await endpoints.forEach((endpoint) => {
      promises.push(
        new Promise((resolve) => {
          doBlastNotification({ sns, title, message, endpoint, extraData }, (error/* , res */) => {
            if (!error) successful += 1;
            resolve();
          });
        }),
      );
    });
    await Promise.allSettled(promises);
    return { successful };
  } finally {
    client.close();
  }
};
