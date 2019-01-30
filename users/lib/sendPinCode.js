import { MongoClient } from 'mongodb';
import phoneCleaner from 'phone';
import SNS from 'aws-sdk/clients/sns';

import generatePinCode from './generatePinCode';

export default async (phone) => {
  const sns = new SNS({
    region: process.env.SNS_REGION,
    credentials: {
      accessKeyId: process.env.SNS_KEY_ID,
      secretAccessKey: process.env.SNS_SECRET,
    },
  });
  const pinCode = generatePinCode();
  const phoneObj = {
    phone,
    pinCode,
    createAt: new Date(),
    validated: false,
  };
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    await client.db(process.env.DB_NAME).collection('phonesCollection')
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
      PhoneNumber: cleandedNumber,
    };
    await sns.publish(params).promise();
    await client.db(process.env.DB_NAME).collection('phonesCollection')
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
