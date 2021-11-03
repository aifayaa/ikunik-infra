import MongoClient, { ObjectID } from '../../libs/mongoClient';

const {
  COLL_USER_BADGES,
} = process.env;

export default async (userId, appId, {
  name,
  description = '',
  color = '#FFFFFF',
  validationUrl = '',
}) => {
  const client = await MongoClient.connect();

  try {
    if (!name) throw new Error('missing_user_badge_name');

    const existingObj = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({ appId, name });

    if (existingObj) {
      throw new Error('duplicate_user_badge');
    }

    const userBadgeObj = {
      _id: new ObjectID().toString(),
      appId,
      createdAt: new Date(),
      authorId: userId,
      name,
      description,
      color,
      validationUrl,
    };

    await client
      .db()
      .collection(COLL_USER_BADGES)
      .insertOne(userBadgeObj);

    return (userBadgeObj);
  } finally {
    client.close();
  }
};
