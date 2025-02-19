/* eslint-disable import/no-relative-packages */
import SNS from 'aws-sdk/clients/sns';

const { SNS_KEY_ID, SNS_REGION, SNS_SECRET } = process.env;

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

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
    cb(new Error('No notification type defined, notification not sent'));
    return null;
  }
  const params = {
    Message: JSON.stringify(msg),
    MessageStructure: 'json',
    TargetArn: endpoint.EndpointArn,
  };
  return sns.publish(params, cb);
};
