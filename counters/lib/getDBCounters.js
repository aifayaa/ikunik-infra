import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
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
  countersSettings,
  commonSettings,
) => {
  const client = await MongoClient.connect();

  try {
    const now = new Date();
    const updateToken = (new ObjectID()).toString();
    const updatesExpires = new Date(Date.now() - UPDATE_EXPIRES_DELAY);

    const pendingUpdates = [];
    const results = {};

    const promises = Object.keys(countersSettings).map(async (settingKey) => {
      const counterSettings = countersSettings[settingKey];
      const {
        appId,
        type,
        name,
        updateQuery,
        options: { initialValue = 0, expiresDelay = 60000 } = {},
      } = {
        ...counterSettings,
        ...commonSettings,
      };

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
          results[settingKey] = initialValue;
          return;
        }
      }

      if (counter.expiresAt <= now) {
        if (!counter.updatingAt || counter.updatingAt <= updatesExpires) {
          pendingUpdates.push({
            _id: counter._id,
            appId,
            type,
            name,
            updateQuery,
            expiresDelay,
            updateToken,
          });
        }
      }

      results[settingKey] = counter.value;
    });

    await Promise.all(promises);

    if (pendingUpdates.length > 0) {
      await client
        .db()
        .collection(COLL_COUNTERS)
        .updateMany(
          { _id: { $in: pendingUpdates.map(({ _id }) => (_id)) } },
          { $set: { updatingAt: new Date(), updateToken } },
        );

      await lambda.invokeAsync({
        FunctionName: `counters-${process.env.STAGE}-updateDBCounters`,
        InvokeArgs: JSON.stringify(pendingUpdates),
      }).promise();
    }

    return (results);
  } finally {
    client.close();
  }
};
