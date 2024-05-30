/* eslint-disable import/no-relative-packages */
import { appPrivateFieldsProjection } from '../../apps/lib/appsUtils.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const { COLL_APPS, COLL_USERS, COLL_WEBSITES } = mongoCollections;

function appendPipelineFilters(pipeline, sortBy, sortOrder) {
  pipeline.push({
    $lookup: {
      from: COLL_WEBSITES,
      localField: '_id',
      foreignField: 'appId',
      as: 'websites',
    },
  });
  if (sortBy && sortOrder) {
    pipeline.push({ $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } });
  }

  return pipeline;
}

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const user = await db.collection(COLL_USERS).findOne({ _id: userId });

    if (user.superAdmin) {
      const allApps = await db
        .collection(COLL_APPS)
        .aggregate(
          appendPipelineFilters(
            [{ $project: appPrivateFieldsProjection }],
            'name',
            -1
          )
        )
        .toArray();

      return allApps;
    }

    const appsIds = objGet(user, ['perms', 'apps'], []).map(({ _id }) => _id);
    const orgsIds = objGet(user, ['perms', 'organizations'], []).map(
      ({ _id }) => _id
    );

    const $or = [];
    if (appsIds.length > 0) {
      $or.push({ _id: { $in: appsIds } });
    }
    if (orgsIds.length > 0) {
      $or.push({ 'organization._id': { $in: orgsIds } });
    }

    if ($or.length === 0) return [];

    const apps = await db
      .collection(COLL_APPS)
      .aggregate(
        appendPipelineFilters(
          [
            {
              $match: {
                $or,
              },
            },
            { $project: appPrivateFieldsProjection },
          ],
          'name',
          -1
        )
      )
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
