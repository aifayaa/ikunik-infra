import SNS from 'aws-sdk/clients/sns';
import check from 'check-types';
import get from 'lodash/get';
import pick from 'lodash/pick';
import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';

const {
  SNS_REGION,
  SNS_KEY_ID,
  SNS_SECRET,
  MONGO_URL,
  DB_NAME,
  COLL_APPS,
  COLL_PUSH_NOTIFICATIONS,
} = process.env;

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

export default async ({ userId, Token, deviceUUID, platform, appId }) => {
  if (
    check.not.string(Token) ||
    check.not.string(deviceUUID) ||
    check.not.string(platform)
  ) throw new Error('wrong_args_type');

  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const app = await client.db(DB_NAME)
      .collection(COLL_APPS).findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');

    const platformApplicationArns = get(app, 'settings.platformApplicationArns');
    if (!platformApplicationArns) throw new Error('missing_platform_arn_in_app_config');

    const PlatformApplicationArn = platformApplicationArns[platform].arn;
    const collection = client.db(DB_NAME)
      .collection(COLL_PUSH_NOTIFICATIONS);

    const found = await collection.findOne(
      { Token, PlatformApplicationArn, appIds: { $elemMatch: { $eq: appId } } },
      { projection: { _id: 1 } },
    );
    if (found) throw new Error('already_registered_token');

    const Platform = platformApplicationArns[platform].platform;
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
        appId,
      },
    };
    return await collection.updateOne(
      pick(modifier.$set, 'deviceUUID', 'platform', 'appId'),
      modifier,
      { upsert: true },
    );
  } finally {
    client.close();
  }
};
