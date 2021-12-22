import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BADGES } = mongoCollections;

export default async (userBadgeId, appId, {
  access,
  color = '#FFFFFF',
  description = '',
  isDefault,
  management,
  name,
  validationUrl = '',
}) => {
  const client = await MongoClient.connect();

  try {
    if (!name) throw new Error('missing_user_badge_name');
    const userBadgeObj = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({
        _id: userBadgeId,
        appId,
      });

    if (!userBadgeObj) {
      throw new Error('content_not_found');
    }

    if (userBadgeObj.name !== name) {
      const existingObj = await client
        .db()
        .collection(COLL_USER_BADGES)
        .findOne({ appId, name });

      if (existingObj) {
        throw new Error('duplicate_user_badge');
      }
    }

    const $set = {
      name,
      updatedAt: new Date(),

      description,
      access,
      management,
      isDefault,
      color,
      validationUrl,
    };

    await client
      .db()
      .collection(COLL_USER_BADGES)
      .updateOne({
        _id: userBadgeId,
        appId,
      }, { $set });

    return ({ ...userBadgeObj, ...$set });
  } finally {
    client.close();
  }
};
