import SNS from 'aws-sdk/clients/sns';
import AWSId from './generateAWSId';

const {
  SNS_REGION,
  SNS_KEY_ID,
  SNS_SECRET,
} = process.env;

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

export default ({ artistName, endpoint, message }, cb) => {
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
