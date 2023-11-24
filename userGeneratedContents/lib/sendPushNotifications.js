import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from 'mongodb/lib/mongo_client';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const { REGION, STAGE } = process.env;

const {
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS,
} = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

async function sendNotificationFor({
  appId,
  content,
  extraData = {},
  title,
  userId,
  notifSettingsField,
}, client) {
  const notifyAt = new Date();

  const toUser = await client
    .db()
    .collection(COLL_USERS)
    .findOne({
      _id: userId,
      appId,
    });

  const canSend = objGet(toUser, ['settings', 'notifications', notifSettingsField], true);

  if (!toUser || !canSend) {
    return;
  }

  await lambda.invoke({
    FunctionName: `blast-${STAGE}-queueNotifications`,
    Payload: JSON.stringify({
      appId,
      notifyAt,
      type: 'usersDirectPush',
      only: 'users',
      data: {
        userIds: [userId],
        content,
        title,
        extraData,
      },
    }),
  }).promise();
}

export default async function sendNewUGCPushNotifications({
  appId,
  // parentCollection,
  parentId,
  replyTo,
  rootParentCollection,
  rootParentId,
  userId,
}) {
  const client = await MongoClient.connect();

  try {
    let rootUgc = null;
    const fromUser = await client
      .db()
      .collection(COLL_USERS)
      .findOne({
        _id: userId,
        appId,
      });
    if (rootParentCollection === COLL_USER_GENERATED_CONTENTS) {
      rootUgc = await client
        .db()
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({
          _id: rootParentId,
          appId,
        });
      if (rootUgc && rootUgc.userId !== userId) {
        await sendNotificationFor({
          appId,
          content: `L'utilisateur ${fromUser.profile.username} a commenté votre publication`,
          extraData: { userArticleId: rootParentCollection },
          notifSettingsField: 'ugc_post_replies',
          title: 'Nouveau commentaire',
          userId: rootUgc.userId,
        }, client);
      }
    }

    if (replyTo || parentId !== rootParentId) {
      const ugc = await client
        .db()
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({
          _id: replyTo || parentId,
          appId,
        });
      if (ugc && ugc.userId !== userId) {
        const extraData = (
          rootParentCollection === COLL_USER_GENERATED_CONTENTS
            ? { userArticleId: rootParentCollection }
            : { articleId: rootParentCollection }
        );
        await sendNotificationFor({
          appId,
          content: `L'utilisateur ${fromUser.profile.username} a répondu à votre commentaire`,
          extraData,
          notifSettingsField: 'ugc_comment_replies',
          title: 'Nouvelle réponse',
          userId: ugc.userId,
        }, client);
      }
    }
  } finally {
    client.close();
  }
}
