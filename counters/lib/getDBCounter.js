/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_COUNTERS } = mongoCollections;

const UPDATE_EXPIRES_DELAY = 120000;

const lambda = new Lambda({
  region: process.env.REGION,
});

/**
 * This function shall only be called internally, not through API directly.
 * When called, the calling serverless module should be able to execute lambdas.
 */
export default async (
  appId,
  type,
  name,
  updateQuery,
  { initialValue = 0, expiresDelay = 60000 } = {}
) => {
  const client = await MongoClient.connect();

  try {
    const now = new Date();
    let counter = await client
      .db()
      .collection(COLL_COUNTERS)
      .findOne({ appId, type, name });

    if (!counter) {
      counter = {
        appId,
        type,
        name,
        value: initialValue,
        expiresAt: now,
      };

      try {
        const { insertedId } = await client
          .db()
          .collection(COLL_COUNTERS)
          .insertOne(counter);

        counter._id = insertedId;
      } catch (e) {
        // May fail because of a duplicate key. Don't worry, it's updating behind the scene :-)
        return initialValue;
      }
    }

    if (counter.expiresAt <= now) {
      const updatesExpires = new Date(Date.now() - UPDATE_EXPIRES_DELAY);
      if (!counter.updatingAt || counter.updatingAt <= updatesExpires) {
        const updateToken = new ObjectID().toString();
        await client
          .db()
          .collection(COLL_COUNTERS)
          .updateOne(
            { _id: counter._id },
            { $set: { updatingAt: new Date(), updateToken } }
          );
        await lambda
          .invokeAsync({
            FunctionName: `counters-${process.env.STAGE}-updateDBCounter`,
            InvokeArgs: JSON.stringify({
              _id: counter._id,
              appId,
              type,
              name,
              updateQuery,
              expiresDelay,
              updateToken,
            }),
          })
          .promise();
      }
    }

    return counter.value;
  } finally {
    client.close();
  }
};
