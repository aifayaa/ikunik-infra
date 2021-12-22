import phoneCleaner from 'phone';
import SNS from 'aws-sdk/clients/sns';
import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  SNS_KEY_ID,
  SNS_REGION,
  SNS_SECRET,
  SNS_TOPIC,
} = process.env;

const {
  COLL_CONTACTS,
  COLL_PHONES,
  COLL_USERS,
} = mongoCollections;

export default async (phone, pinCode, deviceUuid, userId) => {
  const sns = new SNS({
    region: SNS_REGION,
    credentials: {
      accessKeyId: SNS_KEY_ID,
      secretAccessKey: SNS_SECRET,
    },
  });
  const client = await MongoClient.connect();
  try {
    const { value } = await client
      .db()
      .collection(COLL_PHONES)
      .findOneAndUpdate({
        phone,
        pinCode,
        validated: false,
      }, { $set: { validated: true } });

    if (!value) {
      throw new Error('phone, pin code not found or pin already validated');
    }

    let params = {
      Protocol: 'sms',
      TopicArn: SNS_TOPIC,
      Endpoint: phone,
    };
    await sns.subscribe(params).promise();

    const cleanded = phoneCleaner(phone, '');
    if (cleanded.length === 0) {
      throw new Error('not a recognized phone number format');
    }
    const cleandedPhoneNumber = cleanded[0];
    if (cleanded[1] === 'USA') {
      const text = 'Welcome to Crowdaa exclusive fans club! Msg&data rates may apply. 1msg/wk. Reply HELP for help, STOP to cancel.';
      params = {
        Message: text,
        MessageStructure: 'string',
        PhoneNumber: cleandedPhoneNumber,
      };

      await sns.publish(params).promise();
    }

    const res = await client
      .db()
      .collection(COLL_USERS)
      .findOneAndUpdate({ _id: userId }, { $set: { 'profile.phone': cleandedPhoneNumber } });
    const user = res.value || {};
    if (!user) {
      throw new Error('user not found');
    }

    const firstname = get(user, 'profile.firstname', user.firstname);
    const lastname = get(user, 'profile.lastname', user.lastname);
    const contact = {
      fromDeviceUuid: deviceUuid,
      firstname,
      lastname,
      name: user.username,
      phoneNumber: phone,
      cleandedPhoneNumber,
      selectedGenres: {},
      invitedByUserID: null,
    };

    await client
      .db()
      .collection(COLL_CONTACTS)
      .update({ phoneNumber: phone }, { $set: contact }, { upsert: true });
  } finally {
    client.close();
  }
};
