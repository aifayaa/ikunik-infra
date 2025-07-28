/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UserType } from './userEntity';
import { userPrivateFieldsProjection } from './usersUtils';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_USERS, COLL_FORUM_TOPICS, COLL_FORUM_TOPIC_REPLIES } =
  mongoCollections;

type GetPublicProfileParamsType = {
  forumStats: boolean;
};

type GetPublicProfileReturnType = UserType & {
  forumStats?: {
    topics: number;
    replies: number;
    solutions: number;
  };
};

export default async (
  userId: string,
  appId: string,
  { forumStats }: GetPublicProfileParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const user = (await client
      .db()
      .collection(COLL_USERS)
      .findOne(
        { _id: userId, appId },
        { projection: userPrivateFieldsProjection }
      )) as GetPublicProfileReturnType | null;

    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The user ${userId} was not found in app ${appId}`
      );
    }

    if (forumStats) {
      const topics = ((await client
        .db()
        .collection(COLL_FORUM_TOPICS)
        .find({ createdBy: userId, appId })
        .count()) || 0) as number;
      const replies = ((await client
        .db()
        .collection(COLL_FORUM_TOPIC_REPLIES)
        .find({ createdBy: userId, appId })
        .count()) || 0) as number;
      const solutions = ((await client
        .db()
        .collection(COLL_FORUM_TOPIC_REPLIES)
        .find({ createdBy: userId, appId, solved: true })
        .count()) || 0) as number;

      user.forumStats = {
        topics,
        replies,
        solutions,
      };
    }

    return user;
  } finally {
    client.close();
  }
};
