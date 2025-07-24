/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType } from './forumEntities';
import { getUserFilteredBadgesIdsFromInput } from './forumUtils';

const { COLL_FORUM_CATEGORIES } = mongoCollections;

type CreateForumCategoryParamsType = {
  name: string;
  description: string;
  icon?: string;
  badges: Array<string>;
  badgesAllow: 'all' | 'any';
};

export default async (
  appId: string,
  userId: string,
  {
    name,
    description,
    icon,
    badges: inputBadgesIds,
    badgesAllow,
  }: CreateForumCategoryParamsType
) => {
  const client = await MongoClient.connect();
  try {
    const _id = ObjectID().toString();

    const filteredBadgesIds = await getUserFilteredBadgesIdsFromInput(
      userId,
      appId,
      inputBadgesIds,
      {
        client,
      }
    );

    const newForumCategory: ForumCategoryType = {
      _id,
      appId,
      createdAt: new Date(),
      createdBy: userId,
      name,
      description,
      icon,
      stats: {
        topicsCount: 0,
      },

      badges: {
        allow: badgesAllow,
        list: filteredBadgesIds.map((id) => ({
          id,
        })),
      },
    };

    await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .insertOne(newForumCategory);

    return newForumCategory;
  } finally {
    await client.close();
  }
};
