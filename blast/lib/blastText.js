/* eslint-disable import/no-relative-packages */
import SNS from 'aws-sdk/clients/sns';
import phone from 'phone';
import AWSId from './generateAWSId';

const { SNS_REGION, SNS_KEY_ID, SNS_SECRET, STAGE } = process.env;

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

export default ({ message, phoneNumber }, cb) => {
  const params = {
    Message: message,
    MessageStructure: 'string',
    PhoneNumber: phone(phoneNumber)[0],
  };
  if (STAGE !== 'dev' && STAGE !== 'preprod') return sns.publish(params, cb);
  return cb(null, {
    ResponseMetadata: {
      RequestId: AWSId(),
      MessageId: AWSId(),
    },
  });
};
