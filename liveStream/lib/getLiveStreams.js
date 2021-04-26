import MongoClient from '../../libs/mongoClient';
import { filterOutput } from './utils';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
} = process.env;

export default async (appId, {
  id,
  start,
  limit,
}) => {
  const $match = {
    appId,
  };

  const client = await MongoClient.connect();
  try {
    let pipelineSkipLimit = [];
    if (id) {
      $match._id = id;
    } else {
      start = parseInt(start, 10) || 0;
      limit = parseInt(limit, 10) || 10;
      pipelineSkipLimit = [{ $skip: start }, { $limit: limit }];
    }

    const pipeline = [
      { $match },
      {
        $sort: {
          createdAt: -1,
          name: 1,
        },
      },
      ...pipelineSkipLimit,
    ];

    let list = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .aggregate(pipeline)
      .toArray();
    list = list.map((item) => (filterOutput(item)));

    const count = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .find($match, { projection: { _id: 1 } })
      .count();

    return ({ list, count });
  } finally {
    client.close();
  }
};
