import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (
  appId,
  parentId,
  parentCollection,
  rootParentId,
  rootParentCollection,
  userId,
  type,
  data,
) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;

  try {
    /* Otherwise, insert the category to the database and return it */
    const userGeneratedContents = {
      _id: new ObjectID().toString(),
      parentId,
      parentCollection,
      rootParentId,
      rootParentCollection,
      userId,
      appIds: [appId],
      type,
      data,
      trashed: false,
      createdAt: new Date(),
      modifiedAt: false,
    };

    const _id = await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .insertOne(userGeneratedContents);

    return { _id, ...userGeneratedContents };
  } finally {
    client.close();
  }
};
