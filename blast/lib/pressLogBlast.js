import MongoClient, { ObjectID } from '../../libs/mongoClient';

const STATUSES = {
  PENDING: 0,
  PREPARING: 1,
  RUNNING: 2,
  SUCCEEDED: 9,
  FAILED: 10,
};

const {
  COLL_PRESS_BLASTS,
  DB_NAME,
} = process.env;

export default async ({
  appId,
  content,
  id,
  limit,
  numRecipients = null,
  parameters,
  stats = {},
  type,
  userId,
}) => {
  const client = await MongoClient.connect();
  const collection = client
    .db(DB_NAME)
    .collection(COLL_PRESS_BLASTS);

  const { insertedId: operationId } = await collection
    .insertOne({
      _id: ObjectID(id || undefined),
      appId,
      content,
      date: new Date(),
      limit,
      numRecipients,
      parameters,
      stats,
      status: STATUSES.PREPARING,
      type,
      userId,
    });

  return {
    operationId,
    prepared: ({ numRecipients: recipients }) => collection
      .updateOne({
        _id: ObjectID(operationId),
      }, {
        $set: {
          modifiedAt: new Date(),
          numRecipients: recipients,
          status: STATUSES.RUNNING,
        },
      }),
    update: (statsUpdate) => collection
      .updateOne({
        _id: ObjectID(operationId),
      }, {
        $set: {
          modifiedAt: new Date(),
          stats: statsUpdate,
        },
      }),
    fails: async (infos) => {
      await collection
        .updateOne({
          _id: ObjectID(operationId),
        }, {
          $set: {
            infos,
            modifiedAt: new Date(),
            status: STATUSES.FAILED,
          },
        });
      client.close();
    },
    success: async ({ infos, stats: statsUpdate }) => {
      await collection
        .updateOne({
          _id: ObjectID(operationId),
        }, {
          $set: {
            infos,
            statsUpdate,
            modifiedAt: new Date(),
            status: STATUSES.SUCCEEDED,
          },
        });
      client.close();
    },
    get: () => collection
      .findOne({
        _id: ObjectID(operationId),
      }),
  };
};
