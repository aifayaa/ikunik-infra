/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import tosFields from '../tosFields.json';

const { COLL_TOS } = mongoCollections;

export const getTos = async (appId, tosId, options = {}) => {
  const query = {
    appId,
  };

  if (tosId) {
    query._id = tosId;
  }

  if (options.outdated !== undefined) {
    query.outdated = {
      $exists: options.outdated,
    };
  }
  if (options.required !== undefined) {
    query.required = options.required;
  }
  if (options.type !== undefined) {
    if (options.type === 'tos') {
      query.$or = [{ type: 'tos' }, { type: { $exists: false } }];
    } else {
      query.type = options.type;
    }
  }

  const { public: projection } = tosFields;

  const client = await MongoClient.connect();
  try {
    const tos = await client
      .db()
      .collection(COLL_TOS)
      .find(query, {
        projection,
        sort: { createdAt: -1 },
      })
      .toArray();
    return tos;
  } finally {
    client.close();
  }
};
