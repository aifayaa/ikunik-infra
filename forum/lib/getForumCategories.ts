/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType } from './forumEntities';
import { getUserBadgesByPermsLevels } from './forumUtils';

const { COLL_FORUM_CATEGORIES } = mongoCollections;

type GetForumCategoriesParamsType = {
  start: number;
  limit: number;
};

export default async (
  appId: string,
  userId: string,
  { start, limit }: GetForumCategoriesParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const { canList: listableBadges } = await getUserBadgesByPermsLevels(
      userId,
      appId,
      {
        client,
      }
    );

    const listableBadgesIds = listableBadges.map(({ _id }) => _id);

    const searchQuery = {
      appId,
      $or: [
        { 'badges.list': { $size: 0 } },
        {
          'badges.allow': 'all',
          'badges.list.id': { $all: listableBadgesIds },
        },
        {
          'badges.allow': 'any',
          'badges.list.id': { $in: listableBadgesIds },
        },
      ],
    };

    const categoriesList = (await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .find(searchQuery)
      .skip(start)
      .limit(limit)
      .toArray()) as ForumCategoryType[];

    const categoriesCount = (await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .find(searchQuery)
      .count()) as number;

    return { items: categoriesList, totalCount: categoriesCount };
  } finally {
    await client.close();
  }
};
