/* eslint-disable import/no-relative-packages */
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  APP_NOT_FOUND,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_ORGANIZATION,
} from '../../libs/httpResponses/errorCodes';
import Random from '../../libs/account_utils/random';
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
    const packageIdSuffix = Random.randomString(
      10,
      'abcdefghijklmnopqrstuvwxyz0123456789'
    );
    const packageId = `com.crowdaa.app.${packageIdSuffix}`;

    objSet(app, ['builds', platform], {
      name: app.name,
      packageId,
      platform: 'android',
      repository: 'crowdaa_press_yui',
      author: 'Crowdaa',
      description: `Welcome on ${app.name} community app!`,
      email: 'support@crowdaa.com',
    });

    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        {
          _id: app._id,
        },
        {
          $set: {
            [`builds.${platform}`]: app.builds[platform],
          },
        }
      );
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

  const type = `build-${platform}`;

  await client.withSession((sessionArg) =>
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
            pipeline: [{ step: 'queued', tags: ['queue'] }],
            progression: 0,
            current: {
              step: 'queued',
              startedAt: now,
              tags: ['queue'],
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

      const settedPipeline = {
        _id: insertedId,
        status: 'queued',
        date: now,
      };
      objSet(app, ['builds', platform, 'pipeline'], settedPipeline);

      const $set = {
        [`builds.${platform}.pipeline`]: settedPipeline,
      };

      await client
        .db()
        .collection(COLL_APPS)
        .updateOne({ _id: app._id }, { $set }, { session });
    })
  );

  const filteredApp = filterAppPrivateFields(app);

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
            name: 1,
            builds: 1,
            organization: 1,
          },
        }
      );

    if (!app) {
      throw new CrowdaaException(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND,
        `The application with ID ${appId} was not found`
      );
    }

    if (!app.organization || !app.organization._id) {
      throw new CrowdaaException(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_ORGANIZATION,
        `The application ${appId} have no organization set`
      );
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
