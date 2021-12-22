import MongoClient from '../../libs/mongoClient';
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

  if (typeof options.outdated !== 'undefined') {
    query.outdated = {
      $exists: options.outdated,
    };
  }
  if (typeof options.required !== 'undefined') {
    query.required = options.required;
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
      }).toArray();
    return tos;
  } finally {
    client.close();
  }
};
