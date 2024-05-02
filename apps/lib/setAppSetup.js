/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_PIPELINES } = mongoCollections;

const TIMEOUT_DELAY = 20 * 60 * 1000;

async function setAppSetupField({ client, app, now }) {
  const { insertedId } = await client
    .db()
    .collection(COLL_PIPELINES)
    .insertOne({
      appId: app._id,
      createdAt: new Date(),
      type: 'appSetup',
      pipeline: [{ key: 'queued', tag: 'start' }],
      progression: 0,
      currentStep: 'queued',
      startedAt: new Date(),
      status: 'running',
      steps: {
        queued: {
          startedAt: new Date(),
          status: 'running',
        },
      },
    });

  const $set = {
    setup: {
      _id: insertedId,
      status: 'queued',
      date: now,
    },
  };

  await client.db().collection(COLL_APPS).updateOne({ _id: app._id }, { $set });
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
      if (app.builds) {
        return { queued: false, status: 'done' };
      }
      await setAppSetupField({ client, app, now });
      return { queued: true, status: 'queued' };
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
    await setAppSetupField({ client, app, now });
    return { queued: true, status: 'queued' };
  } finally {
    client.close();
  }
};
