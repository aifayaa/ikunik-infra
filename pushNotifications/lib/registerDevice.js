/* eslint-disable import/no-relative-packages */
import SNS from 'aws-sdk/clients/sns';
import check from 'check-types';
import get from 'lodash/get';
import pick from 'lodash/pick';
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { SNS_REGION, SNS_KEY_ID, SNS_SECRET } = process.env;

const { COLL_APPS, COLL_PUSH_NOTIFICATIONS } = mongoCollections;

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
  )
    throw new Error('wrong_args_type');

  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');

    const platformApplicationArns = get(
      app,
      'settings.platformApplicationArns'
    );
    if (!platformApplicationArns)
      throw new Error('missing_platform_arn_in_app_config');

    const PlatformApplicationArn = platformApplicationArns[platform].arn;
    const collection = client.db().collection(COLL_PUSH_NOTIFICATIONS);

    const found = await collection.findOne(
      { Token, PlatformApplicationArn, appId },
      { projection: { _id: 1 } }
    );
    if (found) throw new Error('already_registered_token');

    const Platform = platformApplicationArns[platform].platform;
    let CustomUserData = uuidv4();
    let EndpointArn = null;

    try {
      const params = {
        CustomUserData,
        PlatformApplicationArn,
        Token,
      };
      ({ EndpointArn } = await sns.createPlatformEndpoint(params).promise());
    } catch (e) {
      /* If its a known error : ARN does already exists */
      if (
        e.statusCode === 400 &&
        !e.retryable &&
        e.code === 'InvalidParameter'
      ) {
        [EndpointArn] = e.message.match(
          /arn:aws:sns:[^: ]+:[0-9]+:([^ ,'":])+/
        );

        if (!EndpointArn)
          throw new Error('AWS API changed : cannot retrieve EndpointArn');

        const { Attributes } = await sns
          .getEndpointAttributes({ EndpointArn })
          .promise();

        if (Attributes.Token !== Token) throw new Error('token_mismatch');

        ({ CustomUserData } = Attributes);

        /* Re-throwing unknown errors */
      } else {
        throw e;
      }
    }

    const modifier = {
      $set: {
        deviceUUID,
        Platform,
        platform,
        PlatformApplicationArn,
        Token,
        EndpointArn,
        SNSUserData: CustomUserData,
        userId: userId || null,
        modifiedAt: new Date(),
        appId,
      },
    };
    const searchQuery = pick(modifier.$set, 'deviceUUID', 'platform', 'appId');
    const previousDevice = await collection.findOne(searchQuery);

    if (
      previousDevice &&
      previousDevice.EndpointArn &&
      previousDevice.EndpointArn !== EndpointArn // Should never be false, but anyway...
    ) {
      await sns
        .deleteEndpoint({ EndpointArn: previousDevice.EndpointArn })
        .promise();
    }

    return await collection.updateOne(searchQuery, modifier, { upsert: true });
  } finally {
    await client.close();
  }
};
