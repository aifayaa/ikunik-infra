/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from 'mongodb/lib/mongo_client';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { REGION, STAGE } = process.env;

const { COLL_USERS, COLL_USER_GENERATED_CONTENTS } = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

async function sendNotificationFor(
  { appId, content, extraData = {}, title, userId, notifSettingsField },
  client
) {
  const notifyAt = new Date();

  const toUser = await client.db().collection(COLL_USERS).findOne({
    _id: userId,
    appId,
  });

  const canSend = objGet(
    toUser,
    ['settings', 'notifications', notifSettingsField],
    true
  );

  if (!toUser || !canSend) {
    return false;
  }

  await lambda
    .invoke({
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
    })
    .promise();

  return true;
}

export default async function sendNewUGCPushNotifications({
  // parentCollection,
  appId,
  lang,
  parentId,
  replyTo,
  rootParentCollection,
  rootParentId,
  userId,
}) {
  const client = await MongoClient.connect();

  try {
    intlInit(lang);

    const sentTo = [];
    let rootUgc = null;
    const fromUser = await client.db().collection(COLL_USERS).findOne({
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
        const sent = await sendNotificationFor(
          {
            appId,
            content: formatMessage('ugc:ugc_post_replied_push.text', {
              username: fromUser.profile.username,
            }),
            extraData: { userArticleId: rootParentId },
            notifSettingsField: 'ugc_post_replies',
            title: formatMessage('ugc:ugc_post_replied_push.title'),
            userId: rootUgc.userId,
            commentType: 'postComment',
          },
          client
        );
        if (sent) {
          sentTo.push(rootUgc.userId);
        }
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
      if (ugc && ugc.userId !== userId && sentTo.indexOf(ugc.userId) < 0) {
        const extraData =
          rootParentCollection === COLL_USER_GENERATED_CONTENTS
            ? { userArticleId: rootParentId }
            : { articleId: rootParentId };
        const sent = await sendNotificationFor(
          {
            appId,
            content: formatMessage('ugc:ugc_comment_replied_push.text', {
              username: fromUser.profile.username,
            }),
            extraData,
            notifSettingsField: 'ugc_comment_replies',
            title: formatMessage('ugc:ugc_comment_replied_push.title'),
            userId: ugc.userId,
            commentType: 'commentReply',
          },
          client
        );
        if (sent) {
          sentTo.push(ugc.userId);
        }
      }
    }
  } finally {
    client.close();
  }
}
