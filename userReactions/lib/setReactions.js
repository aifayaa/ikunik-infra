/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_REACTIONS } = mongoCollections;

export async function toggleReactionOn(
  appId,
  targetCollection,
  targetId,
  userId,
  reactionType,
  reactionName,
  reactionAt = new Date(),
  disableOtherReactions = true
) {
  const client = await MongoClient.connect();

  try {
    let reaction = await client.db().collection(COLL_USER_REACTIONS).findOne({
      appId,
      targetCollection,
      targetId,
      userId,
      reactionType,
      reactionName,
    });

    if (!reaction) {
      reaction = {
        appId,
        targetCollection,
        targetId,
        userId,
        reactionType,
        reactionName,
        reactionAt,
      };
      const result = await client
        .db()
        .collection(COLL_USER_REACTIONS)
        .insertOne(reaction);

      reaction._id = result.insertedId;
    } else {
      await client.db().collection(COLL_USER_REACTIONS).deleteOne({
        _id: reaction._id,
      });
      reaction = null;
    }

    if (disableOtherReactions) {
      const query = {
        appId,
        targetCollection,
        targetId,
        userId,
        reactionType,
        // no reactionName, we delete all other reactions
      };
      if (reaction) {
        query._id = { $ne: reaction._id };
      }

      await client.db().collection(COLL_USER_REACTIONS).deleteMany(query);
    }

    return reaction;
  } finally {
    client.close();
  }
}

export async function setReactionOn(
  appId,
  targetCollection,
  targetId,
  userId,
  reactionType,
  reactionName,
  reactionAt = new Date(),
  disableOtherReactions = true
) {
  const client = await MongoClient.connect();

  try {
    const reaction = {
      appId,
      targetCollection,
      targetId,
      userId,
      reactionType,
      reactionName,
      reactionAt,
    };
    try {
      const result = await client
        .db()
        .collection(COLL_USER_REACTIONS)
        .insertOne(reaction);

      reaction._id = result.insertedId;
    } catch (e) {
      // Most probably duplicate key, just ignore it
      return null;
    }

    if (disableOtherReactions) {
      const query = {
        _id: { $ne: reaction._id },
        appId,
        targetCollection,
        targetId,
        userId,
        reactionType,
        // no reactionName, we delete all other reactions
      };

      await client.db().collection(COLL_USER_REACTIONS).deleteMany(query);
    }

    return reaction;
  } finally {
    client.close();
  }
}

export async function unsetReactionOn(
  appId,
  targetCollection,
  targetId,
  userId,
  reactionType,
  reactionName,
  reactionAt = null,
  disableOtherReactions = true
) {
  const client = await MongoClient.connect();

  try {
    const deleteOneQuery = {
      appId,
      targetCollection,
      targetId,
      userId,
      reactionType,
      reactionName,
      reactionAt,
    };
    if (reactionAt) {
      deleteOneQuery.reactionAt = reactionAt;
    }

    await client.db().collection(COLL_USER_REACTIONS).deleteOne(deleteOneQuery);

    if (disableOtherReactions) {
      const deleteManyQuery = {
        appId,
        targetCollection,
        targetId,
        userId,
        reactionAt,
        reactionType,
        // no reactionName, we delete all other reactions
      };
      if (reactionAt) {
        deleteManyQuery.reactionAt = reactionAt;
      }

      await client
        .db()
        .collection(COLL_USER_REACTIONS)
        .deleteMany(deleteManyQuery);
    }
  } finally {
    client.close();
  }
}
