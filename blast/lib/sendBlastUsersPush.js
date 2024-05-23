/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendNotificationTo } from './snsNotifications';

const { COLL_USERS, COLL_PUSH_NOTIFICATIONS } = mongoCollections;

export default async (
  appId,
  { filters, message: { title = '', content = '', extraData = {} } }
) => {
  const client = await MongoClient.connect();
  try {
    const dbUsers = client.db().collection(COLL_USERS);

    const pipeline = [
      {
        $match: {
          ...filters,
          appId,
        },
      },
      {
        $lookup: {
          from: COLL_PUSH_NOTIFICATIONS,
          localField: '_id',
          foreignField: 'userId',
          as: 'pushNotifs',
        },
      },
      {
        $unwind: '$pushNotifs',
      },
      {
        $replaceRoot: {
          newRoot: '$pushNotifs',
        },
      },
    ];

    const toSendTo = dbUsers.aggregate(pipeline);

    const promises = [];
    await toSendTo.forEach((endpoint) => {
      promises.push(
        new Promise((resolve, reject) => {
          sendNotificationTo(
            {
              isText: true,
              endpoint,
              title,
              content,
              extraData,
            },
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        })
      );
    });

    const promisesResults = await Promise.allSettled(promises);
    const response = promisesResults.reduce(
      (acc, promise) => {
        if (promise.status === 'fulfilled') {
          acc.success += 1;
        } else {
          acc.errors += 1;
        }
        return acc;
      },
      { success: 0, errors: 0, total: promises.length }
    );

    return response;
  } finally {
    await client.close();
  }
};
