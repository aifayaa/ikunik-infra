/* eslint-disable import/no-relative-packages */
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  APP_NOT_FOUND,
  ERROR_TYPE_NOT_FOUND,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterAppPrivateFields } from './appsUtils';

const { COLL_APPS, COLL_PIPELINES } = mongoCollections;

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
        _id: app.setup._id,
        appId: app._id,
        type: 'appSetup',
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
    const app = await db
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { setup: 1, builds: 1 } });

    if (!app) {
      throw new CrowdaaException(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND,
        `The application with ID ${appId} was not found`
      );
    }

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
