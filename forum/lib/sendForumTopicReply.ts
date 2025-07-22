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
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
  FORUM_TOPIC_CODE,
} from '@libs/httpResponses/errorCodes';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';
import { UserType } from '@users/lib/userEntity';

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
    const _id = ObjectID().toString();

    const topic = (await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .findOne({ _id: topicId, appId })) as ForumTopicType | null;

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

    const newForumReply: ForumTopicReplyType = {
      _id,
      appId,
      categoryId,
      topicId,
      createdAt: new Date(),
      createdBy: userId,
      content,
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

    return { ...newForumReply, author: user };
  } finally {
    await client.close();
  }
};
