/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { reportType } from './type';
import {
  ALREADY_REPORTED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '@libs/httpResponses/errorCodes';

const { COLL_USER_GENERATED_CONTENTS_USER_REPORTS } = mongoCollections;

export default async (
  userId: string,
  type: reportType,
  contentId: string,
  {
    appId,
    details,
    reason,
    ugcId,
  }: { appId: string; details: string; reason: string; ugcId: string }
) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    if (type === 'user') {
      const alreadyBlocked = await db
        .collection(COLL_USER_GENERATED_CONTENTS_USER_REPORTS)
        .findOne({
          appId,
          reportedUserId: contentId,
          userId,
        });

      if (alreadyBlocked) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          ALREADY_REPORTED_CODE,
          `The user '${contentId}' is already reported`
        );
      }

      const result = await db
        .collection(COLL_USER_GENERATED_CONTENTS_USER_REPORTS)
        .insertOne({
          _id: uuid.v4(),
          appId,
          createdAt: new Date(),
          details,
          reason,
          reportedUserId: contentId,
          ugcId,
          userId,
        });

      const { insertedId: _id } = result;

      return await db
        .collection(COLL_USER_GENERATED_CONTENTS_USER_REPORTS)
        .findOne({
          _id,
        });
    }

    return {};
  } finally {
    client.close();
  }
};
