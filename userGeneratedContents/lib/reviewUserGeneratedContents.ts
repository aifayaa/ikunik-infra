import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UGCModerationNotificationDataType, UGCType } from './ugcEntities';
import { getUGCModerationAbstractText } from './ugcUtils';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

const { STAGE, REGION } = process.env as {
  STAGE: 'dev' | 'preprod' | 'prod';
  REGION: 'us-east-1' | 'eu-west-3';
};

const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

type ReviewUserGeneratedContentsParamsType = {
  reason?: string;
  moderated?: boolean;
};

function textEllipsis(text: string) {
  if (text.length > 100) {
    return `${text.substring(0, 97)}...`;
  }

  return text;
}

export default async (
  appId: string,
  userId: string,
  ugc: UGCType,
  { reason = '', moderated }: ReviewUserGeneratedContentsParamsType = {}
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const $set = {
      moderated,
      reason,
      reviewed: true,
    };

    const { matchedCount } = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        {
          _id: ugc._id,
          appId,
        },
        { $set }
      );

    const buildNotifyData: UGCModerationNotificationDataType = {
      appId,
      notifyAt: new Date(),
      type: 'ugcModeration',
      data: {
        ugcId: ugc._id,
        validated: !moderated,
        abstract: getUGCModerationAbstractText(ugc),
        human: true,
        reason,
      },
    };

    await lambda.send(
      new InvokeCommand({
        InvocationType: 'Event',
        FunctionName: `blast-${STAGE}-queueNotifications`,
        Payload: JSON.stringify(buildNotifyData),
      })
    );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
