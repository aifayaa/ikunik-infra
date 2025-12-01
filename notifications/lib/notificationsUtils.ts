import { ObjectID } from '@libs/mongoClient';
import { UserNotificationType } from './notificationsEntities';

export function encodeNextToken(lastNotification: UserNotificationType) {
  const data = JSON.stringify({
    d: lastNotification.sentAt.getTime(),
    i: lastNotification._id,
  });

  const buffer = Buffer.from(data, 'utf8');

  return buffer.toString('base64');
}

export function decodeNextToken(nextToken: string) {
  const buffer = Buffer.from(nextToken, 'base64');

  const data: {
    d: number;
    i: string;
  } = JSON.parse(buffer.toString('utf8'));

  const ret: {
    sentAt: Date;
    _id: string;
  } = {
    sentAt: new Date(data.d),
    _id: data.i,
  };

  return ret;
}
