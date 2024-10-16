/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import allowedTypes from './blockedContentTypes.json';

const { COLL_BLOCKED_CONTENTS, COLL_USERS } = mongoCollections;

export default async (userId, { appId }) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const blockedContents = await db
      .collection(COLL_BLOCKED_CONTENTS)
      .find({
        appId,
        userId,
      })
      .toArray();

    const allowedBlockedContents = blockedContents
      .map((blockedContent) => {
        const { type } = blockedContent;

        if (!allowedTypes[type]) {
          return false;
        }

        return blockedContent;
      })
      .filter((x) => x);

    // For users blocked
    // 1. Retrieve the username of the blocked users
    const blockedUsers = allowedBlockedContents.filter(
      (content) => content.type === 'user'
    );

    const richerBlockedUsers = await Promise.all(
      blockedUsers.map(async (content) => {
        const { contentId: blockedUserId } = content;

        const user = await db.collection(COLL_USERS).findOne({
          _id: blockedUserId,
        });

        return { ...content, blockedUserUsername: user.username };
      })
    );

    // 2. Add the username for blocked users
    for (let i = 0; i < allowedBlockedContents.length; i += 1) {
      const blockedUser = allowedBlockedContents[i];
      if (blockedUser.type !== 'user') {
        continue;
      }

      allowedBlockedContents[i] = {
        ...blockedUser,
        ...richerBlockedUsers.find(
          (richerBlockedUser) =>
            richerBlockedUser.contentId === blockedUser.contentId
        ),
      };
    }

    return allowedBlockedContents;
  } finally {
    client.close();
  }
};
