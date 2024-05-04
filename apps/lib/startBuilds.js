/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objSet } from '../../libs/utils';
import { filterAppPrivateFields } from './appsUtils';

const { COLL_APPS, COLL_PIPELINES } = mongoCollections;

const ALL_PLATFORMS = ['ios', 'android'];

const TIMEOUT_DELAY = 6 * 60 * 60 * 1000;

async function startSetupOrBuildForPlatform(app, platform, { client }) {
  const now = new Date();

  if (!app.builds || !app.builds[platform]) {
    return {
      started: false,
      reason: 'Bad configuration',
    };
  }

  if (app.builds[platform].pipeline && app.builds[platform].pipeline._id) {
    const filteredApp = filterAppPrivateFields(app);
    if (app.builds[platform].pipeline.status === 'queued') {
      return {
        started: false,
        build: filteredApp.builds[platform],
        reason: 'Build already queued',
      };
    }
    if (app.builds[platform].pipeline.status === 'running') {
      const retryIn =
        TIMEOUT_DELAY -
        (now.getTime() - app.builds[platform].pipeline.date.getTime());
      if (retryIn > 0) {
        return {
          started: false,
          build: filteredApp.builds[platform],
          retryIn,
        };
      }
    }
    // case: app.builds[platform].pipeline.status in ['error', 'done']
    // continue below
  }

  const type = app.builds[platform].ready
    ? `build-${platform}`
    : `setup-${platform}`;

  const settedPipeline = await client.withSession((sessionArg) =>
    sessionArg.withTransaction(async (session) => {
      const { insertedId } = await client
        .db()
        .collection(COLL_PIPELINES)
        .insertOne(
          {
            _id: new ObjectID().toString(),
            appId: app._id,
            createdAt: now,
            type,
            input: {
              app: filterAppPrivateFields(app),
            },
            pipeline: [{ key: 'queued', tag: 'start' }],
            progression: 0,
            current: {
              Step: 'queued',
              startedAt: now,
              status: 'running',
            },
            steps: {
              queued: {
                startedAt: now,
                status: 'running',
              },
            },
          },
          { session }
        );

      const pipelineData = {
        _id: insertedId,
        status: 'queued',
        date: now,
      };

      const $set = {
        [`builds.${platform}.pipeline`]: pipelineData,
      };

      await client
        .db()
        .collection(COLL_APPS)
        .updateOne({ _id: app._id }, { $set }, { session });

      return pipelineData;
    })
  );

  const filteredApp = filterAppPrivateFields(
    objSet(app, `builds.${platform}.pipeline`, settedPipeline)
  );

  return {
    started: true,
    build: filteredApp.builds[platform],
  };
}

export default async (appId, { platforms = ALL_PLATFORMS }) => {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        { _id: appId },
        {
          projection: {
            builds: 1,
          },
        }
      );

    if (!app) {
      throw new Error('app_not_found');
    }

    if (!app.organization || !app.organization._id) {
      throw new Error('app_not_linked_to_org');
    }

    const promises = platforms.map(async (platform) => {
      const ret = await startSetupOrBuildForPlatform(app, platform, { client });

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
