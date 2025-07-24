/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumTopicType } from './forumEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
} from '@libs/httpResponses/errorCodes';
import { arrayUniq, indexObjectArrayWithKey } from '@libs/utils';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';
import { getUserBadgesByPermsLevels, getUserBadgesList } from './forumUtils';
import { UserBadgeType } from 'userBadges/lib/userBadgesEntities';
import BadgeChecker from '@libs/badges/BadgeChecker';

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

    console.log('DEBUG badgesByPerms', { badgesByPerms, userBadges });

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

    const authorsIds = arrayUniq(topicsList.map(({ createdBy }) => createdBy));
    if (topicsList.length > 0) {
      const authors =
        authorsIds.length === 0
          ? []
          : await client
              .db()
              .collection(COLL_USERS)
              .find(
                { _id: { $in: authorsIds } },
                { projection: userPrivateFieldsProjection }
              )
              .toArray();

      const indexedAuthors = indexObjectArrayWithKey(authors);
      topicsList.forEach((topic) => {
        if (indexedAuthors[topic.createdBy]) {
          topic.author = indexedAuthors[topic.createdBy];
        } else {
          topic.author = {};
        }
      });
    }

    const badgeChecker = new BadgeChecker(appId);

    try {
      await badgeChecker.init;

      badgeChecker.registerBadges(
        badgesByPerms.canList.map(({ _id: badgeId }) => badgeId)
      );
      await badgeChecker.loadBadges();

      const promises = topicsList.map(async (topic) => {
        if (topic.badges.list.length > 0) {
          const results = await badgeChecker.checkBadges(
            userBadges,
            topic.badges,
            { userId }
          );
          if (!results.canRead) {
            topic.content = '';
            topic.cannotRead = true;
            topic.restrictedBy = results.restrictedBy;
          } else if (!results.canPreview) {
            topic.previewOnly = true;
            topic.restrictedBy = results.restrictedBy;
          }
        }
      });

      await Promise.all(promises);
    } finally {
      await badgeChecker.close();
    }

    return { items: topicsList, totalCount: topicsCount };
  } finally {
    await client.close();
  }
};
