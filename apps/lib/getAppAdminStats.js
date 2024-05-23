/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import getMAU from '../../userMetrics/lib/getMAU';

const { COLL_APPS } = mongoCollections;

const BUILDS_PLATFORMS = ['ios', 'android'];

const BUILDS_KEYS = [
  'author',
  'deployed',
  'description',
  'email',
  'info',
  'name',
  'packageId',
  'platform',
  'ready',
  'repository',
  'status',
  'version',
];

const BUILDS_PROJECTION = BUILDS_PLATFORMS.reduce((acc, platform) => {
  BUILDS_KEYS.forEach((bkey) => {
    acc[`builds.${platform}.${bkey}`] = 1;
  });

  return acc;
}, {});

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const buildsInfos = await client.db().collection(COLL_APPS).findOne(
      {
        _id: appId,
      },
      {
        projection: BUILDS_PROJECTION,
      }
    );

    if (!buildsInfos) {
      return false;
    }

    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const mau = await getMAU(appId, { month, year });

    return {
      builds: buildsInfos.builds || {},
      monthlyActiveUsers: mau,
    };
  } finally {
    client.close();
  }
};
