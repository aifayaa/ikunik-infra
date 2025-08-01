/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
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
import { GenericContentReportType } from '@libs/genericEntities';
import deleteUser from '../../users/lib/deleteUser.js';
import { forumSendReportTopicEmail } from './forumReportingEmailUtils';

const {
  COLL_FORUM_CATEGORIES,
  COLL_FORUM_TOPIC_REPLIES,
  COLL_FORUM_TOPICS,
  COLL_GENERIC_CONTENT_REPORTS,
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
      removed: false,
      'moderation.validated': true,
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
        removed: false,
        'moderation.validated': true,
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

    await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .updateOne(
        {
          _id: topicId,
          appId,
        },
        {
          $set: {
            solutionReplyId: topic.solutionReplyId,
            solved: topic.solved,
          },
        }
      );

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
      removed: false,
      'moderation.validated': true,
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

type ForumTopicActionModerateParamsType = {
  contentIs: 'valid' | 'invalid';
  actions: {
    deleteUser?: boolean;
    removeElement?: boolean;
    deleteContent?: boolean;
  };
  reason: string;
};
export async function forumTopicActionModerate(
  appId: string,
  topicId: string,
  userId: string,
  { reason, contentIs, actions }: ForumTopicActionModerateParamsType
) {
  const client = await MongoClient.connect();

  try {
    const topic = (await client.db().collection(COLL_FORUM_TOPICS).findOne({
      _id: topicId,
      appId,
    })) as ForumTopicType | null;

    if (!topic) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_TOPIC_CODE,
        `The forum topic ${topicId} was not found`
      );
    }

    topic.moderation = {
      checked: true,
      validated: contentIs === 'valid',
      reason,
      checkedBy: userId,
    };

    await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .updateOne(
        { _id: topicId },
        {
          $set: {
            moderation: topic.moderation,
          },
        }
      );

    if (actions.deleteUser) {
      await deleteUser(userId, appId);
    }
    if (actions.removeElement) {
      topic.removed = true;
      await client
        .db()
        .collection(COLL_FORUM_TOPICS)
        .updateOne({ _id: topicId }, { $set: { removed: topic.removed } });
      await client
        .db()
        .collection(COLL_FORUM_TOPIC_REPLIES)
        .updateMany({ topicId }, { $set: { removed: true } });
    } else if (actions.deleteContent) {
      topic.title = '-';
      topic.content = '-';
      await client
        .db()
        .collection(COLL_FORUM_TOPICS)
        .updateOne(
          { _id: topicId },
          {
            $set: {
              title: topic.title,
              content: topic.content,
            },
          }
        );
    }

    return topic;
  } finally {
    await client.close();
  }
}

export async function forumTopicActionReport(
  appId: string,
  topicId: string,
  userId: string,
  { reason, lang }: { reason: string; lang: string }
) {
  const client = await MongoClient.connect();

  try {
    const topic = (await client.db().collection(COLL_FORUM_TOPICS).findOne({
      _id: topicId,
      appId,
      removed: false,
      'moderation.validated': true,
    })) as ForumTopicType | null;

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

    const report: GenericContentReportType = {
      _id: ObjectID().toString(),
      createdAt: new Date(),
      createdBy: userId,
      targetUserId: topic.createdBy,
      appId,
      targetCollection: COLL_FORUM_TOPICS,
      targetId: topicId,
      reason,
      context: {
        from: 'forum',
      },
    };

    await client
      .db()
      .collection(COLL_GENERIC_CONTENT_REPORTS)
      .insertOne(report);

    try {
      await forumSendReportTopicEmail(userId, topic, reason, lang);
    } catch (e) {
      console.log(
        `VERBOSE caught error reporting topic ${topic._id} (report ${report._id}) :`,
        e
      );
    }

    return { reportId: report._id };
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
      removed: false,
      'moderation.validated': true,
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
