/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType } from './forumEntities';

const { COLL_FORUM_CATEGORIES } = mongoCollections;

type CreateForumCategoryParamsType = {
  name: string;
  description: string;
  icon?: string;
};

export default async (
  appId: string,
  userId: string,
  { name, description, icon }: CreateForumCategoryParamsType
) => {
  const client = await MongoClient.connect();
  try {
    const _id = ObjectID().toString();

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
