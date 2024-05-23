/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterAppPrivateFields } from './appsUtils';
import getApp from './getApp';

const { COLL_PIPELINES } = mongoCollections;

const ALL_PLATFORMS = ['ios', 'android'];

async function getSetupOrBuildForPlatform(app, platform, { db }) {
  const pipelinesData = {};

  if (!app.builds || !app.builds[platform]) {
    return {
      ...pipelinesData,
    };
  }

  if (!app.builds[platform].pipeline) {
    return {
      ...pipelinesData,
      build: filterAppPrivateFields(app).builds[platform],
    };
  }

  if (!app.builds[platform].pipeline._id) {
    pipelinesData.pipeline = null;
  } else {
    const pipeline = await db.collection(COLL_PIPELINES).findOne(
      {
        _id: app.builds[platform].pipeline._id,
        appId: app._id,
      },
      { sort: [['createdAt', 1]] }
    );
    pipelinesData.pipeline = pipeline;
  }

  return {
    ...pipelinesData,
    build: filterAppPrivateFields(app).builds[platform],
  };
}

export default async (appId, requestedPlatform, { all = false }) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app = await getApp(appId);

    const platforms = requestedPlatform ? [requestedPlatform] : ALL_PLATFORMS;

    const promises = platforms.map(async (platform) => {
      const ret = await getSetupOrBuildForPlatform(app, platform, { db });

      if (all) {
        const pipelines = await db
          .collection(COLL_PIPELINES)
          .find(
            {
              appId: app._id,
              type: `build-${platform}`,
            },
            { sort: [['createdAt', -1]] }
          )
          .toArray();

        ret.pipelines = pipelines;
      }

      return ret;
    });

    const results = await Promise.all(promises);

    const output = platforms.reduce((acc, platform, id) => {
      acc[platform] = results[id];
      return acc;
    }, {});

    return output;
  } finally {
    client.close();
  }
};
