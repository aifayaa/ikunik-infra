/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId, params = null) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }
    if (!app.setup && !app.builds) {
      return {
        setup: 'not_started',
        build: {
          android: false,
          ios: false,
        },
      };
    }
    if (!app.setup && app.builds) {
      return {
        setup: 'done',
        builds: {
          android:
            app.builds.android !== undefined && app.builds.android !== null,
          ios: app.builds.ios !== undefined && app.builds.ios !== null,
        },
      };
    }
    const { status, statusChangedAt, errors, history } = app.setup;

    const response = {
      status,
      statusChangedAt,
      ...(params.errors ? { errors } : null),
      ...(params.history ? { history } : null),
    };

    return response;
  } finally {
    client.close();
  }
};
