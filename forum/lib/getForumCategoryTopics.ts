/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumTopicType } from './forumEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
} from '@libs/httpResponses/errorCodes';
import {
  addExtraTopicsFields,
  getUserBadgesByPermsLevels,
  getUserBadgesList,
} from './forumUtils';
import { UserBadgeType } from 'userBadges/lib/userBadgesEntities';

const { COLL_FORUM_CATEGORIES, COLL_FORUM_TOPICS, COLL_USERS } =
  mongoCollections;

type GetForumCategoryTopicsParamsType = {
  start: number;
  limit: number;
  sortBy: 'recent' | 'popular' | 'solved';
};

type GetForumCategoryTopicsReturnedType = ForumTopicType & {
  author?: {};
  restrictedBy?: Array<UserBadgeType>;
  cannotRead?: true;
  previewOnly?: true;
};

function getSortField(sortBy: 'recent' | 'popular' | 'solved') {
  switch (sortBy) {
    case 'popular':
      return [
        ['stats.viewsCount', -1],
        ['createdAt', -1],
      ];
    case 'solved':
      return [
        ['solved', -1],
        ['createdAt', -1],
      ];
    case 'recent':
    default:
      return [['createdAt', -1]];
  }
}

function getBadgesFilteringQuery(badgesList: Array<UserBadgeType>) {
  if (badgesList.length === 0) {
    return {
      'badges.list': { $size: 0 },
    };
  }

  const badgesIds = badgesList.map(({ _id }) => _id);

  return {
    $or: [
      { 'badges.list': { $size: 0 } },
      {
        'badges.allow': 'all',
        'badges.list.id': { $all: badgesIds },
      },
      {
        'badges.allow': 'any',
        'badges.list.id': { $in: badgesIds },
      },
    ],
  };
}

export default async (
  appId: string,
  userId: string,
  categoryId: string,
  { start, limit, sortBy }: GetForumCategoryTopicsParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const userBadges = await getUserBadgesList(userId, appId, { client });

    const badgesByPerms = await getUserBadgesByPermsLevels(userId, appId, {
      client,
      userBadges,
    });

    const category = await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .findOne({
        _id: categoryId,
        appId,
        ...getBadgesFilteringQuery(badgesByPerms.canList),
      });

    if (!category) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_CATEGORY_CODE,
        `The forum category ${categoryId} was not found`
      );
    }

    const sortField = getSortField(sortBy);

    const searchQuery = {
      appId,
      categoryId,
      removed: false,
      'moderation.status': 'valid',
      ...getBadgesFilteringQuery(badgesByPerms.canList),
    };

    const topicsList = (await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .find(searchQuery)
      .skip(start)
      .limit(limit)
      .sort(sortField)
      .toArray()) as GetForumCategoryTopicsReturnedType[];

    const topicsCount = (await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .find(searchQuery)
      .count()) as number;

    const ret = await addExtraTopicsFields(topicsList, {
      checkBadges: true,
      userId,
      client,
      appId,
      userBadges,
      badgesByPerms,
    });

    return { items: ret, totalCount: topicsCount };
  } finally {
    await client.close();
  }
};
