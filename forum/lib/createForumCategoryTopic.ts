/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumCategoryType, ForumTopicType } from './forumEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_FORUM_CATEGORIES, COLL_FORUM_TOPICS } = mongoCollections;

type CreateForumCategoryTopicParamsType = {
  title: string;
  content: string;
};

export default async (
  appId: string,
  userId: string,
  categoryId: string,
  { title, content }: CreateForumCategoryTopicParamsType
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
    };

    await client.db().collection(COLL_FORUM_TOPICS).insertOne(newForumTopic);

    return newForumTopic;
  } finally {
    await client.close();
  }
};
