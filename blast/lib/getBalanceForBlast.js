import MongoClient from '../../libs/mongoClient';

const {
  COLL_BALANCE_EMAILS,
  COLL_BALANCE_MESSAGES,
  COLL_BALANCE_NOTIFS,
  COLL_PROFILES,
  DB_NAME,
} = process.env;

export default async (userId, type, appId) => {
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
    $cond: { if: { $gt: [`$${type}.balance`, 0] }, then: `$${type}.balance`, else: 0 },
  };
  const defaultValue = {};
  defaultValue[type] = 0;
  const pipeline = [
    {
      $match: {
        UserId: userId,
        appIds: {
          $elemMatch: {
            $eq: appId,
          },
        },
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
            cond: { $in: [appId, `$$${type}.appIds`] },
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
      .db(DB_NAME)
      .collection(COLL_PROFILES)
      .aggregate(pipeline)
      .toArray();
    return record[0] || defaultValue;
  } finally {
    client.close();
  }
};
