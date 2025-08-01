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
  FORUM_REPLY_NOT_ALLOWED_CODE,
  FORUM_TOPIC_CODE,
} from '@libs/httpResponses/errorCodes';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';
import { UserType } from '@users/lib/userEntity';
import BadgeChecker from '@libs/badges/BadgeChecker';
import { getUserBadgesList, updateTopicRepliesCount } from './forumUtils';

const {
  COLL_FORUM_CATEGORIES,
  COLL_FORUM_TOPICS,
  COLL_FORUM_TOPIC_REPLIES,
  COLL_USERS,
} = mongoCollections;

type SendForumMessageParamsType = {
  content: string;
};

export default async (
  appId: string,
  userId: string,
  topicId: string,
  { content }: SendForumMessageParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const userBadges = await getUserBadgesList(userId, appId, { client });

    const _id = ObjectID().toString();

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
        `The forum topic ${topicId} was not found in category`
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

      if (!finalResults.canRead || !finalResults.canPreview) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          FORUM_REPLY_NOT_ALLOWED_CODE,
          'You are not allowed to post a reply on this topic (missing permissions)'
        );
      }
    } finally {
      await badgeChecker.close();
    }

    const newForumReply: ForumTopicReplyType = {
      _id,
      appId,
      categoryId,
      topicId,
      createdAt: new Date(),
      createdBy: userId,
      content,

      stats: {
        likesCount: 0,
      },

      removed: false,
      moderation: {
        checked: false,
        validated: true,
        reason: 'string',
      },
    };

    await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .insertOne(newForumReply);

    await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .updateOne(
        { _id: topicId },
        {
          $set: {
            lastMessageAt: new Date(),
            lastMessageBy: userId,
          },
        }
      );

    const user = (await client.db().collection(COLL_USERS).findOne(
      { _id: userId },
      {
        projection: userPrivateFieldsProjection,
      }
    )) as UserType;

    await updateTopicRepliesCount(topic, { client });

    return { ...newForumReply, author: user };
  } finally {
    await client.close();
  }
};
