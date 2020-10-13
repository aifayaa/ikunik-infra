import SNS from 'aws-sdk/clients/sns';
import getAppInfos from './getAppInfos';

const {
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
} = process.env;

export const sendPreviewInfoSMS = async (appId, phone) => {
  const { key, name = 'Crowdaa', protocol } = await getAppInfos(appId);
  const sanatizedAppName = name.charAt(0).toUpperCase() + name.slice(1);
  const url = `${protocol}://appPreview/${key}`;

  const sns = new SNS({
    region: SNS_REGION,
    credentials: {
      accessKeyId: SNS_KEY_ID,
      secretAccessKey: SNS_SECRET,
    },
  });

  const text = `Hey! Here's the link to test your app ${sanatizedAppName} : ${url}, enjoy it!`;
  const params = {
    Message: text,
    MessageStructure: 'string',
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional',
      },
    },
    PhoneNumber: phone,
  };

  return sns.publish(params).promise();
};
