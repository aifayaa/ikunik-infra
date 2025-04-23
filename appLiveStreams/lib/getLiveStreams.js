/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterOutput } from './utils.ts';
import { userPrivateFields } from '../../users/lib/usersUtils.ts';

const { COLL_APP_LIVE_STREAMS, COLL_USERS } = mongoCollections;

export default async (
  appId,
  userId,
  { id, start, limit, active = null, users = false }
) => {
  const $match = {
    appId,
  };

  const client = await MongoClient.connect();
  try {
    let pipelineSkipLimit = [];
    let pipelineFetchUsers = [];
    if (id) {
      $match._id = id;
    } else {
      start = parseInt(start, 10) || 0;
      limit = parseInt(limit, 10) || 10;
      pipelineSkipLimit = [{ $skip: start }, { $limit: limit }];
    }

    if (typeof active === 'boolean') {
      $match.isStreaming = active;
    }

    if (users) {
      pipelineFetchUsers = [
        {
          $lookup: {
            from: COLL_USERS,
            localField: 'createdBy',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: userPrivateFields.reduce((acc, field) => {
            acc[`user.${field}`] = 0;
            return acc;
          }, {}),
        },
      ];
    }

    const pipeline = [
      { $match },
      {
        $sort: {
          createdAt: -1,
          name: 1,
        },
      },
      ...pipelineFetchUsers,
      ...pipelineSkipLimit,
    ];

    let list = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .aggregate(pipeline)
      .toArray();
    list = list.map((item) => ({
      ...filterOutput(item, userId === item.createdBy),
      user: item.user,
    }));

    const count = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .find($match, { projection: { _id: 1 } })
      .count();

    return { list, count };
  } finally {
    client.close();
  }
};
