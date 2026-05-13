/* eslint-disable import/no-relative-packages */
import SNS from 'aws-sdk/clients/sns';

const { SNS_REGION } = process.env;

const sns = new SNS({
  region: SNS_REGION,
});

export const sendNotificationTo = (
  { title, message, endpoint, extraData = {} },
  cb
) => {
  const msg = {};
  msg.default = '';
  if (endpoint.Platform === 'APNS') {
    let alert;

    if (!title) alert = message;
    else if (!message) alert = title;
    else alert = `${title}: ${message}`;

    msg[endpoint.Platform] = JSON.stringify({
      aps: {
        alert,
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
