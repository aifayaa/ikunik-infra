/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType } from './forumEntities';

const { COLL_FORUM_CATEGORIES } = mongoCollections;

type GetForumCategoriesParamsType = {
  start: number;
  limit: number;
};

export default async (
  appId: string,
  { start, limit }: GetForumCategoriesParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const searchQuery = { appId };

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
