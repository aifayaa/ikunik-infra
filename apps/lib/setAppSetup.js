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
      statusChangedAt:
        new Date(),
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

const DEFAULT_BUILD_SETUP = {
  status: 'start',
  statusChangedAt: new Date(),
  errorsMessages: [],
  statusHistory: [],
};

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    await client
      .db()
      .collection(COLL_APPS)
      .updateOne({ _id: appId }, { $set: { setup: DEFAULT_BUILD_SETUP } });

    return true;
  } finally {
    client.close();
  }
};
