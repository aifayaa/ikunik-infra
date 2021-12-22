import phoneCleaner from 'phone';
import SNS from 'aws-sdk/clients/sns';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getAppInfos from '../../apps/lib/getAppInfos';
import generatePinCode from './generatePinCode';

const {
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
} = process.env;

const {
  COLL_PHONES,
} = mongoCollections;

export default async (phone, appId) => {
  const { name = 'Crowdaa' } = await getAppInfos(appId);
  const sanatizedName = name.charAt(0).toUpperCase() + name.slice(1);

  const sns = new SNS({
    region: SNS_REGION,
    credentials: {
      accessKeyId: SNS_KEY_ID,
      secretAccessKey: SNS_SECRET,
    },
  });
  const pinCode = generatePinCode();
  const phoneObj = {
    phone,
    pinCode,
    createAt: new Date(),
    validated: false,
  };
  const client = await MongoClient.connect();
  try {
    await client
      .db()
      .collection(COLL_PHONES)
      .insertOne(phoneObj);
    const cleanded = phoneCleaner(phone, '');
    if (cleanded.length === 0) {
      throw new Error('not a recognized phone number format');
    }
    const cleandedNumber = cleanded[0];
    const text = `Hey! Your PIN code is ${pinCode}. Enjoy ${sanatizedName}!`;
    const params = {
      Message: text,
      MessageStructure: 'string',
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
      PhoneNumber: cleandedNumber,
    };
    await sns.publish(params).promise();
    await client.db().collection(COLL_PHONES)
      .update({
        phone,
        pinCode,
      }, {
        $set: {
          cleanPhoneNumber: cleandedNumber,
          pinShooted: true,
          pinShootedAt: new Date(),
        },
      });
  } finally {
    client.close();
  }
};
