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

const {
  COLL_USER_GENERATED_CONTENTS_USER_REPORTS,
  COLL_USER_GENERATED_CONTENTS_REPORTS,
} = mongoCollections;

async function reportContent(
  collection: {
    findOne: (arg: Object) => Promise<Object>;
    insertOne: (arg: Object) => Promise<{ insertedId: string }>;
  },
  toFind: Object,
  toInsert: Object,
  alreadyReportedErrorMessage: string
) {
  const alreadyBlocked = await collection.findOne(toFind);

  if (alreadyBlocked) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      ALREADY_REPORTED_CODE,
      alreadyReportedErrorMessage
    );
  }

  const result = await collection.insertOne(toInsert);

  const { insertedId: _id } = result;

  return await collection.findOne({
    _id,
  });
}

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
      const reportedUserId = contentId;
      const collection = db.collection(
        COLL_USER_GENERATED_CONTENTS_USER_REPORTS
      );
      return await reportContent(
        collection,
        {
          appId,
          reportedUserId,
          userId,
        },
        {
          _id: uuid.v4(),
          appId,
          createdAt: new Date(),
          details,
          reason,
          reportedUserId,
          ugcId,
          userId,
        },
        `The user '${reportedUserId}' is already reported`
      );
    }

    if (type === 'userArticle' || type === 'comment') {
      const collection = db.collection(COLL_USER_GENERATED_CONTENTS_REPORTS);
      return await reportContent(
        collection,
        {
          appId,
          ugcId,
          userId,
        },
        {
          _id: uuid.v4(),
          appId,
          createdAt: new Date(),
          details,
          reason,
          ugcId,
          userId,
        },
        `The article '${ugcId}' is already reported`
      );
    }

    return {};
  } finally {
    client.close();
  }
};
