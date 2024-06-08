/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterAppPrivateFields, getApp } from './appsUtils.ts';

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

function truncateError(pipeline) {
  const { error } = pipeline;
  if (error) {
    const truncatedError = error.slice(0, 2048);
    return { ...pipeline, error: truncatedError };
  } else {
    return pipeline;
  }
}

export default async (appId, requestedPlatform, { all = false }) => {
  console.log('getBuildsStatus: handler');
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app = await getApp(appId);

    const platforms = requestedPlatform ? [requestedPlatform] : ALL_PLATFORMS;

    const promises = platforms.map(async (platform) => {
      let ret = await getSetupOrBuildForPlatform(app, platform, { db });
      // ret = {
      //   ...ret,
      //   pipeline: {
      //     ...ret.pipeline,
      //     current: truncateError(ret.pipeline.current),
      //   },
      //   build: {
      //     ...ret.build,
      //     pipeline: truncateError(ret.build.pipeline),
      //   },
      // };
      if (ret && ret.pipeline && ret.pipeline.current) {
        ret = {
          ...ret,
          pipeline: {
            ...ret.pipeline,
            current: truncateError(ret.pipeline.current),
          },
        };
      }
      if (ret && ret.build && ret.build.pipeline) {
        ret = {
          ...ret,
          build: {
            ...ret.build,
            pipeline: truncateError(ret.build.pipeline),
          },
        };
      }

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
          // Arbitrary limit the number of pipeline to retrieve
          .limit(5)
          .toArray();

        // Limit the size of the error field to avoid timeout
        ret.pipelines = pipelines.map(truncateError);
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
