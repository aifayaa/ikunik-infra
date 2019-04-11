import check from 'check-types';
import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';
import SNS from 'aws-sdk/clients/sns';
import pick from 'lodash/pick';

const sns = new SNS({
  region: process.env.SNS_REGION,
  credentials: {
    accessKeyId: process.env.SNS_KEY_ID,
    secretAccessKey: process.env.SNS_SECRET,
  },
});

const generateArn = (arn, customer) => {
  const upperCustomer = customer.charAt(0).toUpperCase() + customer.slice(1);
  return arn.replace(/crowdaa/i, upperCustomer);
};

const platformApplicationArn = {
  Android: {
    arn: generateArn.bind(null, process.env.SNS_PLATFORM_ANDROID_ARN),
    plateform: 'GCM',
  },
  iOs: {
    arn: generateArn.bind(null, process.env.SNS_PLATFORM_IOS_ARN, 'Crowdaa'),
    plateform: 'APNS',
  },
};

export default async ({ userId, Token, deviceUUID, platform, customer }) => {
  if (
    check.not.string(Token) ||
    check.not.string(deviceUUID) ||
    check.not.string(platform) ||
    !(Object.keys(platformApplicationArn).indexOf(platform) + 1)
  ) throw new Error('wrong_args_type');

  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const collection = client.db(process.env.DB_NAME)
      .collection(process.env.COLL_PUSH_NOTIFICATIONS);

    const PlatformApplicationArn = platformApplicationArn[platform].arn(customer);
    const found = await collection.findOne(
      { Token, PlatformApplicationArn, clients: { $elemMatch: { $eq: customer } } },
      { projection: { _id: 1 } },
    );
    if (found) throw new Error('already_registered_token');

    const Platform = platformApplicationArn[platform].plateform;
    const params = {
      PlatformApplicationArn,
      Token,
      CustomUserData: uuidv4(),
    };
    const { EndpointArn } = await sns.createPlatformEndpoint(params).promise();
    const modifier = {
      $set: {
        deviceUUID,
        Platform,
        platform,
        PlatformApplicationArn,
        Token,
        EndpointArn,
        SNSUserData: params.CustomUserData,
        userId: userId || null,
        modifiedAt: new Date(),
      },
      $addToSet: {
        clients: customer,
      },
    };
    return await collection.updateOne(
      pick(modifier.$set, 'deviceUUID', 'platform', 'userId'),
      modifier,
      { upsert: true },
    );
  } finally {
    client.close();
  }
};
