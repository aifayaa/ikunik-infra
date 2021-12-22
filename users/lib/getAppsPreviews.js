import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, { sortBy, sortOrder } = {}) => {
  const client = await MongoClient.connect();

  try {
    const appUser = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .findOne({ _id: userId });

    if (!appUser || !appUser.previewForAdmin) {
      return ([]);
    }

    const pipeline = [
      {
        $match: {
          _id: appUser.previewForAdmin,
        },
      },
      {
        $lookup: {
          from: mongoCollections.COLL_PERM_GROUPS,
          localField: 'permGroupIds',
          foreignField: '_id',
          as: 'permGroup',
        },
      },
      { $unwind: '$permGroup' },
      {
        $lookup: {
          from: mongoCollections.COLL_APPS,
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
          name: 1,
          'settings.previewKey': 1,
        },
      },
    ];

    if (sortBy && sortOrder) pipeline.push({ $sort: { [sortBy]: (sortOrder === 'desc' ? 1 : -1) } });

    const appsOwnedByUser = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .aggregate(pipeline, { collation: { locale: 'en' } })
      .toArray();

    return (appsOwnedByUser.filter((app) => (
      app.settings && app.settings.previewKey
    )));
  } finally {
    client.close();
  }
};
