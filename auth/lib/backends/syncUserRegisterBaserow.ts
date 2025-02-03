/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import { UTMType, UserProfileType } from '../../../users/lib/userEntity';
import { RequestOptionsType } from '../../../asyncLambdas/lib/networkRequest';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { objGet } from '@libs/utils';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { CROWDAA_REGION, STAGE } = process.env;

const { COLL_USERS } = mongoCollections;

const BASEROW_URL =
  STAGE === 'prod'
    ? 'http://automation.operations.aws.crowdaa.com/webhook/367c7500-f44b-408b-bc4a-7856b9bdf2dd'
    : 'http://automation.operations.aws.crowdaa.com/webhook-test/367c7500-f44b-408b-bc4a-7856b9bdf2dd';
const BASEROW_METHOD = 'POST';

export default async (
  userId: string,
  from: 'crowdaa' | 'wordpress' | 'siwa' | 'facebook' | 'saml'
) => {
  const client = await MongoClient.connect();

  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });
    if (!user) return;

    const { profile, appId } = user;
    const email =
      objGet(user, 'emails.0.address') || objGet(user, 'profile.email') || '';
    const username =
      objGet(user, 'profile.username') || objGet(user, 'username') || '';

    await lambda
      .invokeAsync({
        FunctionName: `asyncLambdas-${process.env.STAGE}-networkRequest`,
        InvokeArgs: JSON.stringify({
          request: {
            method: BASEROW_METHOD,
            uri: BASEROW_URL,
            headers: {},
            json: {
              region: CROWDAA_REGION,
              stage: STAGE,
              appId,
              userId,
              email,
              username,
              profile,
              from,
            },
          },
          options: {
            retries: 5,
            sleepBetweenRetries: 30 * 1000,
            logErrors: true,
          },
        } as RequestOptionsType),
      })
      .promise();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API lambda call error', e, 'for :', {
      BASEROW_URL,
      userId,
    });
  } finally {
    await client.close();
  }
};
