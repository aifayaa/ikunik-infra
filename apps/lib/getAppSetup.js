/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_PIPELINES } = mongoCollections;

export default async (appId, { all }) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app = await db
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { setup: 1, builds: 1 } });

    if (!app) {
      throw new Error('app_not_found');
    }
    if (!app.setup && !app.builds) {
      // DashboardOnly
      return {
        app: {},
      };
    }
    if (!app.setup && app.builds) {
      // Apps build before the `setup` field
      const newSetup = {
        date: new Date(0),
        status: 'done',
      };
      await db
        .collection('apps')
        .updateOne({ _id: appId }, { $set: { setup: newSetup } });
      return {
        app: {
          setup: newSetup,
        },
      };
    }

    const ret = {
      app: {
        setup: app.setup,
      },
    };
    if (!app.setup._id) {
      const pipelines = await db
        .collection(COLL_PIPELINES)
        .find({ appId, type: 'appSetup' }, { sort: [['createdAt', 1]] })
        .toArray();
      if (pipelines.length > 0) {
        if (all) {
          ret.pipelines = pipelines;
        } else {
          ret.pipeline = pipelines[pipelines.length - 1];
        }
      }
      return ret;
    }

    if (all) {
      const pipelines = await db
        .collection(COLL_PIPELINES)
        .find({ appId, type: 'appSetup' }, { sort: [['createdAt', 1]] })
        .toArray();
      if (pipelines.length > 0) {
        ret.pipelines = pipelines;
      }
    } else {
      const pipeline = await db.collection(COLL_PIPELINES).findOne(
        {
          _id: app.setup._id,
          appId,
          type: 'appSetup',
        },
        { sort: [['createdAt', 1]] }
      );
      ret.pipeline = pipeline;
    }

    return ret;
  } finally {
    client.close();
  }
};
