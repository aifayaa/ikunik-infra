import MongoClient from 'mongodb/lib/mongo_client';
import Lambda from 'aws-sdk/clients/lambda';
import { toggleReactionOn } from './setReactions';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { formatMessage, intlInit } from '../../libs/intl/intl';

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
    return (false);
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

  return (true);
}

export default async function ugcReact(appId, ugcId, userId, reaction, { lang }) {
  const client = await MongoClient.connect();

  try {
    intlInit(lang);

    const insertedReaction = await toggleReactionOn(
      appId,
      COLL_USER_GENERATED_CONTENTS,
      ugcId,
      userId,
      'reaction',
      reaction,
    );

    if (insertedReaction) {
      const [rootUgc, fromUser] = await Promise.all([
        client.db().collection(COLL_USER_GENERATED_CONTENTS)
          .findOne({
            _id: ugcId,
            appId,
          }),
        client.db().collection(COLL_USERS)
          .findOne({
            _id: userId,
            appId,
          }),
      ]);
      if (rootUgc && rootUgc.userId !== userId) {
        const extraData = (
          rootUgc.rootParentCollection === COLL_USER_GENERATED_CONTENTS
            ? { userArticleId: rootUgc.rootParentId }
            : { articleId: rootUgc.rootParentId }
        );

        if (!rootUgc.parentCollection) {
          await sendNotificationFor({
            appId,
            content: formatMessage('ugc:ugc_post_reacted_push.text', { username: fromUser.profile.username }),
            extraData,
            notifSettingsField: 'ugc_post_reactions',
            title: formatMessage('ugc:ugc_post_reacted_push.title'),
            userId: rootUgc.userId,
          }, client);
        } else {
          await sendNotificationFor({
            appId,
            content: formatMessage('ugc:ugc_comment_reacted_push.text', { username: fromUser.profile.username }),
            extraData,
            notifSettingsField: 'ugc_comment_reactions',
            title: formatMessage('ugc:ugc_comment_reacted_push.title'),
            userId: rootUgc.userId,
          }, client);
        }
      }
    }

    return ({ added: !!insertedReaction });
  } finally {
    client.close();
  }
}
