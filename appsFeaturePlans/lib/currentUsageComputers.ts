import { AppType } from '@apps/lib/appEntity';
import { FeatureIdType } from './planTypes';
import { getAppActiveUsers } from '../../userMetrics/lib/getAppActiveUsers.js';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import getAppAdmins from '@apps/lib/getAppAdmins';

const { COLL_USER_BADGES, COLL_LIVE_STREAM, COLL_PRESS_POLLS } =
  mongoCollections;

type CurrentUsageComputerType = (app: AppType) => Promise<number>;

export const currentUsageComputers: Partial<
  Record<FeatureIdType, CurrentUsageComputerType>
> = {
  // Not measurable :
  appAnalytics: (_app: AppType) => {
    return Promise.resolve(0);
  },

  appTabs: (_app: AppType) => {
    return Promise.resolve(0);
  },

  appTheme: (_app: AppType) => {
    return Promise.resolve(0);
  },

  chat: (_app: AppType) => {
    return Promise.resolve(0);
  },

  community: (_app: AppType) => {
    return Promise.resolve(0);
  },

  translations: (_app: AppType) => {
    return Promise.resolve(0);
  },

  // Measurable :
  playlists: async (_app: AppType) => {
    return 0; // TODO Implement me later
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
  collaborators: async (app: AppType) => {
    const admins = await getAppAdmins(app._id, {
      includeSuperAdmins: false,
      userProjection: {
        _id: 1,
        'emails.address': 0,
        'profile.firstname': 0,
        'profile.lastname': 0,
      },
    });

    return admins.length;
  },
  liveStreams: async (app: AppType) => {
    const client = await MongoClient.connect();

    try {
      const count = await client
        .db()
        .collection(COLL_LIVE_STREAM)
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
};
