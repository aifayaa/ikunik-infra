/* eslint-disable import/no-relative-packages */
import SNS from 'aws-sdk/clients/sns';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PUSH_NOTIFICATIONS } = mongoCollections;
const { SNS_KEY_ID, SNS_REGION, SNS_SECRET } = process.env;

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

export class NoNotificationTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoNotificationTypeError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NoNotificationTypeError);
    }
  }
}

export const sendNotificationTo = (
  { isText = false, endpoint, ...payload },
  cb
) => {
  const msg = {};
  if (isText) {
    const { title = '', content: message = '', extraData = {} } = payload;
    msg.default = '';
    if (endpoint.Platform === 'APNS') {
      let alert;

      if (!title) alert = message;
      else if (!message) alert = title;
      else alert = { title, body: message };

      msg[endpoint.Platform] = JSON.stringify({
        aps: {
          alert,
          sound: 'default',
        },
        ...extraData,
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
  } else {
    cb(
      new NoNotificationTypeError(
        'No notification type defined, notification not sent'
      )
    );
    return null;
  }
  const params = {
    Message: JSON.stringify(msg),
    MessageStructure: 'json',
    TargetArn: endpoint.EndpointArn,
  };
  return sns.publish(params, cb);
};

async function handleNotificationError(endpoint, { db }) {
  let attributes = null;
  let notFound = false;
  try {
    attributes = await sns
      .getEndpointAttributes({
        EndpointArn: endpoint.EndpointArn,
      })
      .promise();
  } catch (e2) {
    if (e2.code === 'NotFound') {
      notFound = true;
    } else {
      throw e2;
    }
  }

  if (notFound || attributes.Attributes.Enabled === 'false') {
    await db
      .collection(COLL_PUSH_NOTIFICATIONS)
      .deleteOne({ _id: endpoint._id });

    if (!notFound) {
      await sns
        .deleteEndpoint({
          EndpointArn: endpoint.EndpointArn,
        })
        .promise();
    }

    return { ok: false, deleted: true };
  } else {
    return { ok: false, deleted: false };
  }
}

export const sendNotificationToAndHandleErrors = async (
  { isText = false, endpoint, ...payload },
  { db }
) => {
  const msg = {};
  if (isText) {
    const { title = '', content: message = '', extraData = {} } = payload;
    msg.default = '';
    if (endpoint.Platform === 'APNS') {
      let alert;

      if (!title) alert = message;
      else if (!message) alert = title;
      else alert = { title, body: message };

      msg[endpoint.Platform] = JSON.stringify({
        aps: {
          alert,
          sound: 'default',
        },
        ...extraData,
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
  } else {
    throw new NoNotificationTypeError(
      'No notification type defined, notification not sent'
    );
  }

  const params = {
    Message: JSON.stringify(msg),
    MessageStructure: 'json',
    TargetArn: endpoint.EndpointArn,
  };
  try {
    const { MessageId } = await sns.publish(params).promise();
    return { ok: true, MessageId };
  } catch (e) {
    const res = await handleNotificationError(endpoint, { db });
    return res;
  }
};
