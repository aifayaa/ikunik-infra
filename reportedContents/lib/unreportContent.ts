/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { reportType } from './type';

const {
  COLL_USER_GENERATED_CONTENTS_USER_REPORTS,
  COLL_USER_GENERATED_CONTENTS_REPORTS,
} = mongoCollections;

export default async (
  userId: string,
  type: reportType,
  contentId: string,
  { appId }: { appId: string }
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
        await db
          .collection(COLL_USER_GENERATED_CONTENTS_USER_REPORTS)
          .deleteOne({
            _id: alreadyBlocked._id,
          });
      }
    }

    if (type === 'userArticle' || type === 'comment') {
      const alreadyBlocked = await db
        .collection(COLL_USER_GENERATED_CONTENTS_REPORTS)
        .findOne({
          appId,
          ugcId: contentId,
          userId,
        });

      if (alreadyBlocked) {
        await db.collection(COLL_USER_GENERATED_CONTENTS_REPORTS).deleteOne({
          _id: alreadyBlocked._id,
        });
      }
    }

    return true;
  } finally {
    client.close();
  }
};
