import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UserNotificationType } from './notificationsEntities';
import { decodeNextToken, encodeNextToken } from './notificationsUtils';

const { COLL_NOTIFICATIONS } = mongoCollections;

// 30 days
const HIDE_NOTIFICATIONS_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

type GetMyNotificationsParamsType = {
  nextToken?: string;
  limit: number;
};

export default async function getMyNotifications(
  userId: string,
  appId: string,
  { nextToken: oldNextToken, limit }: GetMyNotificationsParamsType
) {
  const $match: any = {
    appId,
    target: 'user',
    userId,
    sentAt: { $gt: new Date(Date.now() - HIDE_NOTIFICATIONS_AFTER_MS) },
  };

  if (oldNextToken) {
    const decoded = decodeNextToken(oldNextToken);
    $match.sentAt.$lte = decoded.sentAt;
    $match._id = { $ne: decoded._id };
  }

  const client = await MongoClient.connect();
  try {
    const list = (await client
      .db()
      .collection(COLL_NOTIFICATIONS)
      .find($match)
      .sort([
        ['sentAt', -1],
        ['_id', -1],
      ])
      .limit(limit)
      .toArray()) as Array<UserNotificationType>;

    const total = await client
      .db()
      .collection(COLL_NOTIFICATIONS)
      .find($match, { projection: { _id: 1 } })
      .count();

    let newNextToken = null;
    if (list.length === limit) {
      newNextToken = encodeNextToken(list[list.length - 1]);
    }

    return { list, total, nextToken: newNextToken };
  } finally {
    await client.close();
  }
}
