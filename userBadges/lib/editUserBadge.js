import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_BADGES,
} = process.env;

export default async (userBadgeId, appId, {
  name,
  description,
  color,
  validationUrl,
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
    };
    if (description !== undefined) {
      $set.description = description;
    }
    if (color !== undefined) {
      $set.color = color;
    }
    if (validationUrl !== undefined) {
      $set.validationUrl = validationUrl;
    }

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
