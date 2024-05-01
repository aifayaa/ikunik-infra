/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

const TIMEOUT_DELAY = 20 * 60 * 1000;

async function setAppSetupField({ client, appId, now }) {
  const $set = {
    setup: {
      status: 'queued',
      date: now,
    },
  };

  await client.db().collection(COLL_APPS).updateOne({ _id: appId }, { $set });
}

export default async (appId) => {
  const client = await MongoClient.connect();
  const now = new Date();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({
      _id: appId,
    });

    if (!app) {
      throw new Error('app_not_found');
    }

    if (!app.setup) {
      await setAppSetupField({ client, appId, now });
      return { queued: true };
    }

    if (app.setup.status === 'done' || app.setup.status === 'queued') {
      return { queued: false, status: app.setup.status };
    }
    if (app.setup.status === 'running') {
      if (now.getTime() - app.setup.date.getTime() < TIMEOUT_DELAY) {
        return {
          queued: false,
          status: app.setup.status,
          retryIn: TIMEOUT_DELAY - (now.getTime() - app.setup.date.getTime()),
        };
      }
    }
    // case: app.setup.status === 'error'
    await setAppSetupField({ client, appId, now });
    return { queued: true };
  } finally {
    client.close();
  }
};
