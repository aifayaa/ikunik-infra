/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, data) => {
  const client = await MongoClient.connect();

  try {
    const newTaskObj = {
      ...data,

      _id: new ObjectID().toString(),
      createdAt: new Date(),
      createdBy: userId,
    };

    await client.db().collection(COLL_ORGANIZATIONS).insertOne(newTaskObj);

    await client
      .db()
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId },
        {
          $push: {
            'perms.orgs': {
              _id: newTaskObj._id,
              roles: ['owner'],
            },
          },
        }
      );

    return newTaskObj;
  } finally {
    client.close();
  }
};
