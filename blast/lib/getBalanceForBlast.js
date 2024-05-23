/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_BALANCE_EMAILS,
  COLL_BALANCE_MESSAGES,
  COLL_BALANCE_NOTIFS,
  COLL_PROFILES,
} = mongoCollections;

export default async (profileId, type, appId) => {
  let client;
  let collName;
  switch (type) {
    case 'email':
      collName = COLL_BALANCE_EMAILS;
      break;
    case 'notification':
      collName = COLL_BALANCE_NOTIFS;
      break;
    case 'text':
      collName = COLL_BALANCE_MESSAGES;
      break;
    default:
  }
  const projection = { _id: 0 };
  projection[`${type}`] = {
    $cond: {
      if: { $gt: [`$${type}.balance`, 0] },
      then: `$${type}.balance`,
      else: 0,
    },
  };
  const defaultValue = {};
  defaultValue[type] = 0;
  const pipeline = [
    {
      $match: {
        _id: profileId,
        appId,
      },
    },
    {
      $lookup: {
        from: collName,
        localField: '_id',
        foreignField: 'profil_ID',
        as: type,
      },
    },
    {
      $addFields: {
        [type]: {
          $filter: {
            input: `$${type}`,
            as: type,
            cond: { $eq: [appId, `$$${type}.appId`] },
          },
        },
      },
    },
    {
      $unwind: {
        path: `$${type}`,
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: projection,
    },
  ];

  try {
    client = await MongoClient.connect();
    const record = await client
      .db()
      .collection(COLL_PROFILES)
      .aggregate(pipeline)
      .toArray();
    return record[0] || defaultValue;
  } finally {
    client.close();
  }
};
