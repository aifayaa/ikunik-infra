/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterAppPrivateFields, getApp } from '../../apps/lib/appsUtils.ts';

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

const MAX_ERROR_LINES = 128;
const MAX_ERROR_CHARS = 8192;

function shortenErrorStr(errorStr) {
  const errorStrLines = errorStr.split(/\n/g);

  if (errorStrLines.length > MAX_ERROR_LINES) {
    const newErrorStr = errorStrLines.slice(-MAX_ERROR_LINES).join('\n');
    if (newErrorStr.length > MAX_ERROR_CHARS) {
      errorStr = errorStr.substr(-MAX_ERROR_CHARS);
    } else {
      errorStr = newErrorStr;
    }
  } else if (errorStr.length > MAX_ERROR_CHARS) {
    errorStr = errorStr.substr(-MAX_ERROR_CHARS);
  }

  return errorStr;
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

    const shortenJSONErrors = (key, val) => {
      if (key === 'error' && typeof val === 'string') {
        return shortenErrorStr(val);
      }

      return val;
    };

    return JSON.parse(JSON.stringify(output, shortenJSONErrors));
  } finally {
    client.close();
  }
};
