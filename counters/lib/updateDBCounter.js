import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_COUNTERS } = mongoCollections;

export default async ({
  _id,
  appId,
  type,
  name,
  updateQuery,
  expiresDelay,
  updateToken,
}) => {
  const client = await MongoClient.connect();

  try {
    const counter = await client
      .db()
      .collection(COLL_COUNTERS)
      .findOne({
        _id,
        appId,
        type,
        name,
        updateToken,
      });

    if (!counter) {
      throw new Error(`Counter not found with ID "${_id}", appId "${appId}", type "${type}", name "${name}", updateToken "${updateToken}"`);
    }

    const {
      collection,
      pipeline,
      outputField = 'count',
    } = updateQuery;

    const [result] = await client
      .db()
      .collection(collection)
      .aggregate(pipeline)
      .toArray();

    if (result && typeof result[outputField] === 'number') {
      await client
        .db()
        .collection(COLL_COUNTERS)
        .updateOne({
          _id,
        }, {
          $unset: {
            updatingAt: '',
            updateToken: '',
          },
          $set: {
            expiresAt: new Date(Date.now() + expiresDelay),
            value: result[outputField],
          },
        });
    }
  } finally {
    client.close();
  }
};
