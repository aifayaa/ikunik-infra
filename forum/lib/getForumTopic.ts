/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType, ForumTopicType } from './forumEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
  FORUM_TOPIC_CODE,
} from '@libs/httpResponses/errorCodes';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';
import { UserType } from '@users/lib/userEntity';
import { addExtraTopicsFields, getUserBadgesList } from './forumUtils';
import BadgeChecker from '@libs/badges/BadgeChecker';
import { UserBadgeType } from 'userBadges/lib/userBadgesEntities';

const { COLL_FORUM_CATEGORIES, COLL_FORUM_TOPICS, COLL_USERS } =
  mongoCollections;

type GetForumTopicReturnType = ForumTopicType & {
  author?: UserType;
  restrictedBy?: Array<UserBadgeType>;
  cannotRead?: true;
  previewOnly?: true;
};

export default async (appId: string, topicId: string, userId: string) => {
  const client = await MongoClient.connect();

  try {
    const userBadges = await getUserBadgesList(userId, appId, { client });

    const topic = (await client.db().collection(COLL_FORUM_TOPICS).findOne({
      _id: topicId,
      appId,
      removed: false,
      'moderation.status': 'valid',
    })) as GetForumTopicReturnType | null;

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

    const [topicWithExtras] = await addExtraTopicsFields([topic], {
      checkBadges: true,
      userId,
      client,
      appId,
      userBadges,
    });

    return topicWithExtras;
  } finally {
    await client.close();
  }
};
