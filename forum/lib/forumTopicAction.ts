/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  ForumCategoryType,
  ForumTopicReplyType,
  ForumTopicType,
} from './forumEntities';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
  FORUM_REPLY_CODE,
  FORUM_TOPIC_CODE,
  NOT_ENOUGH_PERMISSIONS_CODE,
  NOT_THE_OWNER_CODE,
} from '@libs/httpResponses/errorCodes';
import { UserType } from '@users/lib/userEntity';
import BadgeChecker from '@libs/badges/BadgeChecker';
import {
  addExtraTopicsFields,
  getUserBadgesList,
  updateTopicLikesCount,
  updateTopicViewsCount,
} from './forumUtils';

const {
  COLL_FORUM_CATEGORIES,
  COLL_FORUM_TOPIC_REPLIES,
  COLL_FORUM_TOPICS,
  COLL_USER_REACTIONS,
} = mongoCollections;

type ForumTopicActionSolveReturnType = ForumTopicType & {
  author?: UserType;
};

async function addReaction(
  appId: string,
  topicId: string,
  userId: string,
  reactionName: 'like' | 'view',
  { client }: { client: any }
) {
  const targetCollection = COLL_FORUM_TOPICS;
  const targetId = topicId;
  const reactionType = reactionName === 'view' ? 'view' : 'reaction';

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
      reactionAt: new Date(),
    };
    const result = await client
      .db()
      .collection(COLL_USER_REACTIONS)
      .insertOne(reaction);
    reaction._id = result.insertedId;
  }

  return reaction;
}
async function toggleReaction(
  appId: string,
  topicId: string,
  userId: string,
  reactionName: 'like' | 'view',
  { client }: { client: any }
) {
  const targetCollection = COLL_FORUM_TOPICS;
  const targetId = topicId;
  const reactionType = reactionName === 'view' ? 'view' : 'reaction';

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
      reactionAt: new Date(),
    };
    const result = await client
      .db()
      .collection(COLL_USER_REACTIONS)
      .insertOne(reaction);
    reaction._id = result.insertedId;
  } else {
    await client
      .db()
      .collection(COLL_USER_REACTIONS)
      .deleteOne({ _id: reaction._id });
    reaction = null;
  }

  return reaction;
}

export async function forumTopicActionSolve(
  appId: string,
  topicId: string,
  userId: string,
  solutionReplyId: string
) {
  const client = await MongoClient.connect();

  try {
    const topic = (await client.db().collection(COLL_FORUM_TOPICS).findOne({
      _id: topicId,
      appId,
    })) as ForumTopicActionSolveReturnType | null;

    if (!topic) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_TOPIC_CODE,
        `The forum topic ${topicId} was not found`
      );
    }

    if (topic.createdBy !== userId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        NOT_THE_OWNER_CODE,
        'You are not the creator of this topic'
      );
    }

    const { categoryId } = topic;

    const reply = (await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .findOne({
        _id: solutionReplyId,
        appId,
        categoryId,
        topicId,
      })) as ForumTopicReplyType | null;

    if (!reply) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_REPLY_CODE,
        `The forum reply ${solutionReplyId} was not found`
      );
    }
    topic.solutionReplyId = solutionReplyId;
    topic.solved = true;

    const [topicWithExtras] = await addExtraTopicsFields([topic], {
      checkBadges: true,
      userId,
      client,
      appId,
    });

    return topicWithExtras;
  } finally {
    await client.close();
  }
}

export async function forumTopicActionToggleLike(
  appId: string,
  topicId: string,
  userId: string
) {
  const client = await MongoClient.connect();

  try {
    const topic = (await client.db().collection(COLL_FORUM_TOPICS).findOne({
      _id: topicId,
      appId,
    })) as ForumTopicActionSolveReturnType | null;

    if (!topic) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_TOPIC_CODE,
        `The forum topic ${topicId} was not found`
      );
    }

    const { categoryId } = topic;

    const category = (await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .findOne({ _id: categoryId, appId })) as ForumCategoryType | null;

    if (!category) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_CATEGORY_CODE,
        `The forum category ${categoryId} was not found`
      );
    }

    const userBadges = await getUserBadgesList(userId, appId, { client });

    const badgeChecker = new BadgeChecker(appId);

    try {
      await badgeChecker.init;

      badgeChecker.registerBadges(userBadges.map(({ id }) => id));
      badgeChecker.registerBadges(topic.badges.list.map(({ id }) => id));
      badgeChecker.registerBadges(category.badges.list.map(({ id }) => id));
      await badgeChecker.loadBadges();

      const topicResults = await badgeChecker.checkBadges(
        userBadges,
        topic.badges,
        { userId }
      );
      const categoryResults = await badgeChecker.checkBadges(
        userBadges,
        category.badges,
        { userId }
      );
      const finalResults = topicResults.merge(categoryResults);
      if (!finalResults.canList) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          NOT_ENOUGH_PERMISSIONS_CODE,
          'You do not have enough permissions for this action'
        );
      }
    } finally {
      await badgeChecker.close();
    }

    const reaction = await toggleReaction(appId, topicId, userId, 'like', {
      client,
    });

    await updateTopicLikesCount(topic, { client });

    return { liked: Boolean(reaction), reactionId: reaction && reaction._id };
  } finally {
    await client.close();
  }
}

export async function forumTopicActionView(
  appId: string,
  topicId: string,
  userId: string
) {
  const client = await MongoClient.connect();

  try {
    const topic = (await client.db().collection(COLL_FORUM_TOPICS).findOne({
      _id: topicId,
      appId,
    })) as ForumTopicActionSolveReturnType | null;

    if (!topic) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_TOPIC_CODE,
        `The forum topic ${topicId} was not found`
      );
    }

    const { categoryId } = topic;

    const category = (await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .findOne({ _id: categoryId, appId })) as ForumCategoryType | null;

    if (!category) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_CATEGORY_CODE,
        `The forum category ${categoryId} was not found`
      );
    }

    const userBadges = await getUserBadgesList(userId, appId, { client });

    const badgeChecker = new BadgeChecker(appId);

    try {
      await badgeChecker.init;

      badgeChecker.registerBadges(userBadges.map(({ id }) => id));
      badgeChecker.registerBadges(topic.badges.list.map(({ id }) => id));
      badgeChecker.registerBadges(category.badges.list.map(({ id }) => id));
      await badgeChecker.loadBadges();

      const topicResults = await badgeChecker.checkBadges(
        userBadges,
        topic.badges,
        { userId }
      );
      const categoryResults = await badgeChecker.checkBadges(
        userBadges,
        category.badges,
        { userId }
      );
      const finalResults = topicResults.merge(categoryResults);
      if (
        !finalResults.canList ||
        !finalResults.canRead ||
        !finalResults.canPreview
      ) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          NOT_ENOUGH_PERMISSIONS_CODE,
          'You do not have enough permissions for this action'
        );
      }
    } finally {
      await badgeChecker.close();
    }

    const { _id: reactionId } = await addReaction(
      appId,
      topicId,
      userId,
      'view',
      { client }
    );

    await updateTopicViewsCount(topic, { client });

    return { viewed: true, reactionId };
  } finally {
    await client.close();
  }
}
