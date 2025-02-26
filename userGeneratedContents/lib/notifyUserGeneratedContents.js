/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { prepareNotif } from './notifications.ts';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;
const { REGION, STAGE } = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (
  appId,
  ugcId,
  { title = null, content = null, notifyAt } = {}
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    if (!(notifyAt instanceof Date)) {
      notifyAt = new Date(notifyAt);
    } else if (notifyAt < new Date()) {
      notifyAt = new Date();
    }

    if (notifyAt.toJSON() === null) {
      notifyAt = new Date();
    }

    const ugc = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .findOne({
        _id: ugcId,
        appId,
        parentCollection: '',
        parentId: null,
        trashed: { $ne: true },
        'data.title': { $exists: true },
        'data.content': { $exists: true },
      });

    if (!ugc) {
      throw new Error('content_not_found');
    }

    if (!title && !content) {
      title = title || prepareNotif(ugc.data.title, 60, false);
      content = content || prepareNotif(ugc.data.content);
    }

    const response = await lambda
      .invoke({
        FunctionName: `blast-${STAGE}-queueNotifications`,
        Payload: JSON.stringify({
          appId,
          notifyAt,
          type: 'userArticle',
          data: {
            ugcId,
            content,
            title,
          },
        }),
      })
      .promise();
    const { queueId } = JSON.parse(response.Payload);

    if (queueId) {
      await client
        .db()
        .collection(COLL_USER_GENERATED_CONTENTS)
        .updateOne(
          {
            _id: ugcId,
            appId,
          },
          {
            $set: {
              pendingNotificationQueueId: queueId,
            },
          }
        );
    }
  } finally {
    client.close();
  }
};
