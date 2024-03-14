/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_PERM_GROUPS, COLL_USERS, COLL_WEBSITES } =
  mongoCollections;

function appendPipelineFilters(pipeline, sortBy, sortOrder) {
  pipeline.push(
    {
      $lookup: {
        from: COLL_WEBSITES,
        localField: '_id',
        foreignField: 'appId',
        as: 'websites',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        'websites._id': 1,
        'websites.dns.internal.name': 1,
        'websites.ssl.domains': 1,
        'websites.type': 1,
      },
    }
  );
  if (sortBy && sortOrder) {
    pipeline.push({ $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } });
  }

  return pipeline;
}

export default async (userId, { sortBy, sortOrder } = {}) => {
  const client = await MongoClient.connect();
  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

    if (user.superAdmin) {
      const collection = COLL_APPS;
      const pipeline = [
        {
          $match: { _id: { $ne: ADMIN_APP } },
        },
      ];
      const appsOwnedByUser = await client
        .db()
        .collection(collection)
        .aggregate(appendPipelineFilters(pipeline, sortBy, sortOrder), {
          collation: { locale: 'en' },
        })
        .toArray();
      return appsOwnedByUser;
    }

    let appsIdsOwnedByUserNew = [];
    let appsIdsOwnedByUserOld = [];
    if (user.perms && user.perms.apps && user.perms.apps.length > 0) {
      const appIds = user.perms.apps.map(({ _id }) => _id).filter((x) => x);
      const collection = COLL_APPS;
      const pipeline = [
        {
          $match: {
            _id: { $in: appIds },
          },
        },
        {
          $project: {
            _id: 1,
          },
        },
      ];
      if (sortBy && sortOrder)
        pipeline.push({ $sort: { [sortBy]: sortOrder === 'desc' ? 1 : -1 } });
      appsIdsOwnedByUserNew = await client
        .db()
        .collection(collection)
        .aggregate(pipeline, { collation: { locale: 'en' } })
        .toArray();
    }

    const collection = COLL_USERS;
    const pipeline = [
      {
        $match: {
          _id: userId,
        },
      },
      {
        $lookup: {
          from: COLL_PERM_GROUPS,
          localField: 'permGroupIds',
          foreignField: '_id',
          as: 'permGroup',
        },
      },
      { $unwind: '$permGroup' },
      {
        $lookup: {
          from: COLL_APPS,
          localField: 'permGroup.appId',
          foreignField: '_id',
          as: 'appOfPermGroup',
        },
      },
      {
        $group: {
          _id: '$appOfPermGroup',
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: '$_id' },
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
    ];
    appsIdsOwnedByUserOld = await client
      .db()
      .collection(collection)
      .aggregate(pipeline, { collation: { locale: 'en' } })
      .toArray();

    const ownedAppsIds = Object.keys(
      [...appsIdsOwnedByUserOld, ...appsIdsOwnedByUserNew].reduce(
        (acc, app) => {
          acc[app._id] = true;
          return acc;
        },
        {}
      )
    );

    const appsOwnedByUser = await client
      .db()
      .collection(COLL_APPS)
      .aggregate(
        appendPipelineFilters(
          [
            {
              $match: {
                _id: { $in: ownedAppsIds },
              },
            },
          ],
          sortBy,
          sortOrder
        ),
        { collation: { locale: 'en' } }
      )
      .toArray();
    return appsOwnedByUser;
  } finally {
    client.close();
  }
};
