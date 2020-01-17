import { MongoClient } from 'mongodb';
import phoneCleaner from 'phone';
import SNS from 'aws-sdk/clients/sns';
import generatePinCode from './generatePinCode';

const {
  COLL_PHONES,
  DB_NAME,
  MONGO_URL,
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
} = process.env;

export default async (phone) => {
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
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    await client
      .db(DB_NAME)
      .collection(COLL_PHONES)
      .insertOne(phoneObj);
    const cleanded = phoneCleaner(phone, '');
    if (cleanded.length === 0) {
      throw new Error('not a recognized phone number format');
    }
    const cleandedNumber = cleanded[0];
    const text = `Hey! Your PIN code is ${pinCode} . Enjoy Crowdaa!`;
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
    await client.db(DB_NAME).collection(COLL_PHONES)
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
