/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType, ForumTopicType } from './forumEntities';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
  FORUM_TOPIC_NOT_ENOUGH_PERMISSIONS_CODE,
} from '@libs/httpResponses/errorCodes';
import {
  getUserBadgesList,
  getUserFilteredBadgesIdsFromInput,
  getUserVisibleBadges,
} from './forumUtils';
import BadgeChecker from '@libs/badges/BadgeChecker';

const { COLL_FORUM_CATEGORIES, COLL_FORUM_TOPICS } = mongoCollections;

type CreateForumCategoryTopicParamsType = {
  title: string;
  content: string;
  badges: Array<string>;
  badgesAllow: 'all' | 'any';
};

async function checkIsUserAllowedToPostOn(
  category: ForumCategoryType,
  userId: string,
  { client }: { client: any }
) {
  const { appId } = category;
  const badgeChecker = new BadgeChecker(appId);

  try {
    await badgeChecker.init;

    const userBadges = await getUserBadgesList(userId, appId, {
      client,
    });

    badgeChecker.registerBadges(category.badges.list.map(({ id }) => id));
    badgeChecker.registerBadges(userBadges.map(({ id }) => id));
    await badgeChecker.loadBadges();

    const result = await badgeChecker.checkBadges(userBadges, category.badges, {
      userId,
    });

    if (!result.canList || !result.canPreview || !result.canRead) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        FORUM_TOPIC_NOT_ENOUGH_PERMISSIONS_CODE,
        `Not enough permissions to publish a topic in category ${category.name}`
      );
    }
  } finally {
    await badgeChecker.close();
  }
}

export default async (
  appId: string,
  userId: string,
  categoryId: string,
  {
    title,
    content,
    badges: inputBadgesIds,
    badgesAllow,
  }: CreateForumCategoryTopicParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const _id = ObjectID().toString();

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

    await checkIsUserAllowedToPostOn(category, userId, {
      client,
    });

    const filteredBadgesIds = await getUserFilteredBadgesIdsFromInput(
      userId,
      appId,
      inputBadgesIds,
      {
        client,
      }
    );

    const newForumTopic: ForumTopicType = {
      _id,
      appId,
      categoryId,
      createdAt: new Date(),
      createdBy: userId,
      title,
      content,
      solved: false,
      stats: {
        viewsCount: 0,
        repliesCount: 0,
      },

      badges: {
        allow: badgesAllow,
        list: filteredBadgesIds.map((id) => ({
          id,
        })),
      },
    };

    await client.db().collection(COLL_FORUM_TOPICS).insertOne(newForumTopic);

    return newForumTopic;
  } finally {
    await client.close();
  }
};
