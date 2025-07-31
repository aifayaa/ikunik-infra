/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { GenericContentReportType } from '@libs/genericEntities';
import { UserType } from '@users/lib/userEntity';

const { COLL_USERS, COLL_GENERIC_CONTENT_REPORTS } = mongoCollections;

type ForumUserActionReportParamsType = {
  reason: string;
  topicId?: string;
  topicReplyId?: string;
};

export async function forumUserActionReport(
  appId: string,
  targetUserId: string,
  userId: string,
  { reason, topicId, topicReplyId }: ForumUserActionReportParamsType
) {
  const client = await MongoClient.connect();

  try {
    const user = (await client.db().collection(COLL_USERS).findOne({
      _id: targetUserId,
      appId,
    })) as UserType | null;

    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The forum user ${userId} was not found`
      );
    }

    const report: GenericContentReportType = {
      _id: ObjectID().toString(),
      createdAt: new Date(),
      createdBy: userId,
      targetUserId: targetUserId,
      appId,
      targetCollection: COLL_USERS,
      targetId: targetUserId,
      reason,
      context: {
        from: 'forum',
      },
    };

    if (topicId) {
      report.context.forumTopicId = topicId;
    }
    if (topicReplyId) {
      report.context.forumTopicReplyId = topicReplyId;
    }

    await client
      .db()
      .collection(COLL_GENERIC_CONTENT_REPORTS)
      .insertOne(report);

    return { reportId: report._id };
  } finally {
    await client.close();
  }
}
