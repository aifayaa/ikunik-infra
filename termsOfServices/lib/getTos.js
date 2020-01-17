import { MongoClient } from 'mongodb';
import tosFields from '../tosFields.json';

const {
  COLL_TOS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export const getTos = async (appId, tosId, options = {}) => {
  const query = {
    appIds: {
      $elemMatch: {
        $eq: appId,
      },
    },
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
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const tos = await client
      .db(DB_NAME)
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
