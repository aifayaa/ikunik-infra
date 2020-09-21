import MongoClient from '../../libs/mongoClient';
import tosFields from '../tosFieldsProjection.json';

const {
  COLL_TOS,
  DB_NAME,
} = process.env;

export const getAppTos = async (appId, options = {}) => {
  const query = {
    appIds: { $elemMatch: { $eq: appId } },
  };

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
    const tosbyapp = await client
      .db(DB_NAME)
      .collection(COLL_TOS)
      .find(query, {
        projection,
      }).toArray();
    return tosbyapp;
  } finally {
    client.close();
  }
};
