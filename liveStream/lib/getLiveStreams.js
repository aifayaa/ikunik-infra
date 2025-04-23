/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { LIVESTREAM_PROVIDER_AWS_IVS } from './constants';
import { filterOutput } from './utils';

const { COLL_LIVE_STREAMS } = mongoCollections;

export default async (appId, { id, start, limit }) => {
  const $match = {
    appId,
    provider: LIVESTREAM_PROVIDER_AWS_IVS,
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
      .db()
      .collection(COLL_LIVE_STREAMS)
      .aggregate(pipeline)
      .toArray();
    list = list.map((item) => filterOutput(item));

    const count = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .find($match, { projection: { _id: 1 } })
      .count();

    return { list, count };
  } finally {
    client.close();
  }
};
