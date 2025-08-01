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
} from '@libs/httpResponses/errorCodes';
import { UserType } from '@users/lib/userEntity';
import BadgeChecker from '@libs/badges/BadgeChecker';
import { getUserBadgesList, updateTopicRepliesLikesCount } from './forumUtils';
import { GenericContentReportType } from '@libs/genericEntities';
import deleteUser from '../../users/lib/deleteUser.js';

const {
  COLL_FORUM_CATEGORIES,
  COLL_FORUM_TOPIC_REPLIES,
  COLL_FORUM_TOPICS,
  COLL_GENERIC_CONTENT_REPORTS,
  COLL_USER_REACTIONS,
} = mongoCollections;

type ForumTopicReplyActionSolveReturnType = ForumTopicReplyType & {
  author?: UserType;
};

async function toggleReaction(
  appId: string,
  replyId: string,
  userId: string,
  reactionName: 'like' | 'view',
  { client }: { client: any }
) {
  const targetCollection = COLL_FORUM_TOPIC_REPLIES;
  const targetId = replyId;
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

export async function forumTopicReplyActionToggleLike(
  appId: string,
  replyId: string,
  userId: string
) {
  const client = await MongoClient.connect();

  try {
    const reply = (await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .findOne({
        _id: replyId,
        appId,
        removed: false,
        'moderation.validated': true,
      })) as ForumTopicReplyActionSolveReturnType | null;

    if (!reply) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_REPLY_CODE,
        `The forum topic reply ${replyId} was not found`
      );
    }

    const { topicId, categoryId } = reply;

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

    const reaction = await toggleReaction(appId, replyId, userId, 'like', {
      client,
    });

    await updateTopicRepliesLikesCount(reply, { client });

    return { liked: Boolean(reaction), reactionId: reaction && reaction._id };
  } finally {
    await client.close();
  }
}

export async function forumTopicReplyActionReport(
  appId: string,
  replyId: string,
  userId: string,
  { reason }: { reason: string }
) {
  const client = await MongoClient.connect();

  try {
    const reply = (await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .findOne({
        _id: replyId,
        appId,
        removed: false,
        'moderation.validated': true,
      })) as ForumTopicReplyType | null;

    if (!reply) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_REPLY_CODE,
        `The forum topic reply ${replyId} was not found`
      );
    }

    const { topicId, categoryId } = reply;

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
      targetUserId: reply.createdBy,
      appId,
      targetCollection: COLL_FORUM_TOPIC_REPLIES,
      targetId: replyId,
      reason,
      context: {
        from: 'forum',
      },
    };

    await client
      .db()
      .collection(COLL_GENERIC_CONTENT_REPORTS)
      .insertOne(report);

    return { reportId: report._id };
  } finally {
    await client.close();
  }
}

type ForumTopicReplyActionModerateParamsType = {
  contentIs: 'valid' | 'invalid';
  actions: {
    deleteUser?: boolean;
    removeElement?: boolean;
    deleteContent?: boolean;
  };
  reason: string;
};
export async function forumTopicReplyActionModerate(
  appId: string,
  replyId: string,
  userId: string,
  { reason, contentIs, actions }: ForumTopicReplyActionModerateParamsType
) {
  const client = await MongoClient.connect();

  try {
    const reply = (await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .findOne({
        _id: replyId,
        appId,
      })) as ForumTopicReplyType | null;

    if (!reply) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_TOPIC_CODE,
        `The forum topic reply ${replyId} was not found`
      );
    }

    reply.moderation = {
      checked: true,
      validated: contentIs === 'valid',
      reason,
      checkedBy: userId,
    };

    await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .updateOne(
        { _id: replyId },
        {
          $set: {
            moderation: reply.moderation,
          },
        }
      );

    if (actions.deleteUser) {
      await deleteUser(userId, appId);
    }
    if (actions.removeElement) {
      reply.removed = true;
      await client
        .db()
        .collection(COLL_FORUM_TOPIC_REPLIES)
        .updateOne({ _id: replyId }, { $set: { removed: reply.removed } });
    } else if (actions.deleteContent) {
      reply.content = '-';
      await client
        .db()
        .collection(COLL_FORUM_TOPIC_REPLIES)
        .updateOne(
          { _id: replyId },
          {
            $set: {
              content: reply.content,
            },
          }
        );
    }

    return reply;
  } finally {
    await client.close();
  }
}
