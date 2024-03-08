/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_PERM_GROUPS, COLL_USERS, COLL_WEBSITES } =
  mongoCollections;

export default async (userId, { sortBy, sortOrder } = {}) => {
  const client = await MongoClient.connect();
  try {
    const isAdmin = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, superAdmin: true });

    let pipeline;
    let collection;
    if (isAdmin) {
      collection = COLL_APPS;
      pipeline = [
        {
          $match: { _id: { $ne: ADMIN_APP } },
        },
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
        },
      ];
    } else {
      collection = COLL_USERS;
      pipeline = [
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
        },
      ];
    }

    if (sortBy && sortOrder)
      pipeline.push({ $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } });
    const appsOwnedByUser = await client
      .db()
      .collection(collection)
      .aggregate(pipeline, { collation: { locale: 'en' } })
      .toArray();

    return appsOwnedByUser;
  } finally {
    client.close();
  }
};
