/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ChatEngineAPI } from '../../libs/backends/chatengine';

const { COLL_APPS, COLL_USERS, COLL_CHATENGINE_ROOM_USERS } = mongoCollections;

const { REGION, STAGE } = process.env;

const lambda = new Lambda({
  region: REGION,
});

const CHATENGINE_ROOM_UPDATE_INTERVAL = 60 * 1000;

function formatMessage(text, haveAttachments = false) {
  const length = 116;

  const preparedText = text
    /* Remove any html markup */
    .replace(/<[^>]+>/g, ' ')
    /* Replace new lines with whitespaces */
    .replace(/[\n\r]+/g, ' ')
    /* Remove successive whitespaces */
    .replace(/\s{2,}/g, ' ')
    /* Remove trailing whitespace at the beginning and at the end */
    .replace(/^\s+|\s+$/, '');

  /* Cut string at size but preserve word */
  const cutRegex = new RegExp(`^(.{${length}}[^\\s]*).*`, 'g');
  const cuttedText = preparedText.replace(cutRegex, '$1');

  if (!cuttedText && haveAttachments) {
    return '📁';
  }

  if (cuttedText.length < text.length) {
    return `${cuttedText}...`;
  }

  return cuttedText;
}

export default async (userId, appId, { roomId, message, haveAttachments }) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user, roomUsers] = await Promise.all([
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
          'credentials.chatengine': { $exists: true },
        },
        {
          projection: {
            'credentials.chatengine': 1,
            'settings.press': 1,
          },
        }
      ),
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
          'services.chatengine': { $exists: true },
        },
        {
          projection: {
            'services.chatengine': 1,
            profile: 1,
          },
        }
      ),
      db.collection(COLL_CHATENGINE_ROOM_USERS).findOne({
        roomId,
        appId,
      }),
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('user_not_found');

    const { chatNotificationsEnabled = true } = app.settings.press || {};
    if (!chatNotificationsEnabled) {
      return;
    }

    let roomUsersId = null;
    if (
      roomUsers &&
      roomUsers.updatedAt.getTime() + CHATENGINE_ROOM_UPDATE_INTERVAL >
        Date.now()
    ) {
      roomUsersId = roomUsers._id;
      if (roomUsers.users.length === 0) {
        return;
      }
    } else {
      const { username } = user.services.chatengine;
      const api = new ChatEngineAPI(app);

      const peoples = await api.call('GET', `/chats/${roomId}/people`);

      const toNotifyUsernames = peoples
        .filter(({ person }) => person.username !== username)
        .map(({ person }) => person.username);

      const users = await db
        .collection(COLL_USERS)
        .find(
          {
            appId,
            'services.chatengine.username': { $in: toNotifyUsernames },
          },
          {
            projection: {
              _id: 1,
            },
          }
        )
        .toArray();
      const userIds = users.map(({ _id }) => _id);

      if (roomUsers) {
        await db.collection(COLL_CHATENGINE_ROOM_USERS).updateOne(
          { _id: roomUsers._id },
          {
            $set: {
              users: userIds,
              updatedAt: new Date(),
            },
          }
        );
        roomUsersId = roomUsers._id;
      } else {
        const { insertedId } = await db
          .collection(COLL_CHATENGINE_ROOM_USERS)
          .insertOne({
            users: userIds,
            updatedAt: new Date(),
          });
        roomUsersId = insertedId;
      }

      if (userIds.length === 0) {
        return;
      }
    }

    await lambda
      .invoke({
        FunctionName: `blast-${STAGE}-queueNotifications`,
        Payload: JSON.stringify({
          appId,
          notifyAt: new Date().toISOString(),
          type: 'chatMessage',
          only: 'users',
          data: {
            message: formatMessage(message, haveAttachments),
            roomUsersId,
            roomId,
          },
        }),
      })
      .promise();
  } finally {
    client.close();
  }
};
