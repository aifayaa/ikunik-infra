import { AppType } from '@apps/lib/appEntity';
import { FeatureIdType } from './planTypes';
import { getAppActiveUsers } from '../../userMetrics/lib/getAppActiveUsers.js';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import computeLiveStreamDurationInMilliseconds from 'liveStream/lib/computeLiveStreamDuration';

const {
  COLL_LIVE_STREAMS,
  COLL_PRESS_IAP_POLLS,
  COLL_PRESS_POLLS,
  COLL_USER_BADGES,
} = mongoCollections;

type CurrentUsageComputerArg2Type = {
  startDate: Date;
  resetDate: Date;
};
type CurrentUsageComputerType = (
  app: AppType,
  periodDetails: CurrentUsageComputerArg2Type
) => Promise<number>;

export const currentUsageComputers: Record<
  FeatureIdType,
  CurrentUsageComputerType
> = {
  // Not measurable :
  appTabs: (_app: AppType) => {
    return Promise.resolve(0);
  },
  appTheme: (_app: AppType) => {
    return Promise.resolve(0);
  },
  chat: (_app: AppType) => {
    return Promise.resolve(0);
  },
  crowd: (_app: AppType) => {
    return Promise.resolve(0);
  },
  translations: (_app: AppType) => {
    return Promise.resolve(0);
  },
  playlists: async (_app: AppType) => {
    return Promise.resolve(0); // TODO Not done for now, shall we?
  },
  leaderboardWp: async (_app: AppType) => {
    return Promise.resolve(0); // TODO Not done for now, shall we?
  },

  // Measurable :
  liveStreamDuration: async (
    app: AppType,
    periodDetails: CurrentUsageComputerArg2Type
  ) => {
    let totalDuration = await computeLiveStreamDurationInMilliseconds(app._id, {
      from: periodDetails.startDate,
      to: periodDetails.resetDate,
    });

    totalDuration /= 1 * 60 * 60 * 1000;

    return totalDuration;
  },
  activeUsers: async (app: AppType) => {
    const activeUsers = await getAppActiveUsers(app);

    return activeUsers.count;
  },
  badges: async (app: AppType) => {
    const client = await MongoClient.connect();

    try {
      const count = await client
        .db()
        .collection(COLL_USER_BADGES)
        .find({ appId: app._id })
        .count();

      return count;
    } finally {
      client.close();
    }
  },
  liveStreams: async (app: AppType) => {
    const client = await MongoClient.connect();

    try {
      const count = await client
        .db()
        .collection(COLL_LIVE_STREAMS)
        .find({ appId: app._id })
        .count();

      return count;
    } finally {
      client.close();
    }
  },
  polls: async (app: AppType) => {
    const client = await MongoClient.connect();

    try {
      const count = await client
        .db()
        .collection(COLL_PRESS_POLLS)
        .find({ appId: app._id })
        .count();

      return count;
    } finally {
      client.close();
    }
  },
  iapPolls: async (app: AppType) => {
    const client = await MongoClient.connect();

    try {
      const count = await client
        .db()
        .collection(COLL_PRESS_IAP_POLLS)
        .find({ appId: app._id })
        .count();

      return count;
    } finally {
      client.close();
    }
  },
};
