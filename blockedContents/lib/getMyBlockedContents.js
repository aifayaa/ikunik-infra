/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import allowedTypes from './blockedContentTypes.json';

const { COLL_BLOCKED_CONTENTS, COLL_USERS, COLL_USER_GENERATED_CONTENTS } =
  mongoCollections;

async function getRickerBlockedUsers(allowedBlockedContents, db) {
  const contentType = 'user';

  // For users blocked
  // 1. Retrieve the username of the blocked users
  const blockedUsers = allowedBlockedContents.filter(
    (content) => content.type === contentType
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
    if (blockedUser.type !== contentType) {
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
}

async function getRickerBlockedUserArticles(allowedBlockedContents, db) {
  const contentType = 'userArticle';

  // For users' articles blocked
  // 1. Retrieve the title of the blocked article
  const blockedUsers = allowedBlockedContents.filter(
    (content) => content.type === contentType
  );

  const richerBlockedUserArticles = await Promise.all(
    blockedUsers.map(async (content) => {
      const { contentId: blockedUserArticleId } = content;

      const article = await db
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({
          _id: blockedUserArticleId,
          type: 'article',
        });

      const title =
        article && article.data && article.data.title ? article.data.title : '';

      return { ...content, blockedUserArticleTitle: title };
    })
  );

  // 2. Add the title for blocked articles
  for (let i = 0; i < allowedBlockedContents.length; i += 1) {
    const blockedUserArticle = allowedBlockedContents[i];
    if (blockedUserArticle.type !== contentType) {
      continue;
    }

    allowedBlockedContents[i] = {
      ...blockedUserArticle,
      ...richerBlockedUserArticles.find(
        (richerBlockedUser) =>
          richerBlockedUser.contentId === blockedUserArticle.contentId
      ),
    };
  }

  return allowedBlockedContents;
}

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

    const richerBlockedContents = await getRickerBlockedUserArticles(
      await getRickerBlockedUsers(allowedBlockedContents, db),
      db
    );

    return richerBlockedContents;
  } finally {
    client.close();
  }
};
