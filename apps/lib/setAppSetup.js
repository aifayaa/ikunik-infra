/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

/**
 * Example of app.setup structure :
  const apps = {
    setup: {
      status: 
        'start' or 'hold' or 'canceled' or 'error' or [processStateName] or 'done',
      statusChangedAt: new Date(),
      errorsMessages: [
        {
          date: new Date(),
          type: 'error type',
          message: 'error message',
        },
      ],
      history: [
        {
          status: apps.setup.status,
          date: apps.setup.statusChangedAt
        }
      ]
    },
  };
*/

export default async (appId) => {
  const client = await MongoClient.connect();
  const now = new Date();
  try {
    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: appId },
        {
          $set: {
            setup: {
              status: 'start',
              statusChangedAt: now,
              errorsMessages: [],
              statusHistory: [
                {
                  status: 'start',
                  date: now,
                },
              ],
            },
          },
        }
      );
  } finally {
    client.close();
  }
};
