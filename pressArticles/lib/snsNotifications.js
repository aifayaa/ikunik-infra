import SNS from 'aws-sdk/clients/sns';

const {
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
} = process.env;

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

export const sendNotificationTo = ({ title, message, endpoint, extraData = {} }, cb) => {
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
