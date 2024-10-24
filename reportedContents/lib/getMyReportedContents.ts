/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { reportType } from './type';

const {
  COLL_USER_GENERATED_CONTENTS_USER_REPORTS,
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS_REPORTS,
  COLL_USER_GENERATED_CONTENTS,
} = mongoCollections;

type reportedUserType = {
  _id: string;
  appId: string;
  createdAt: Date;
  details: string;
  reason: string;
  reportedUserId: string;
  ugcId: string;
  userId: string;
};

type reportedUserArticleType = {
  _id: string;
  appId: string;
  createdAt: Date;
  details: string;
  reason: string;
  ugcId: string;
  userId: string;
};

type aggregatedReportedUserType =
  | reportedUserType
  | { type: reportType; reportedUserUsername: string | undefined };

type aggregatedReportedUserArticleType =
  | reportedUserArticleType
  | { type: reportType; reportedUserArticleTitle: string | undefined };

export default async (
  userId: string,
  { appId }: { appId: string }
): Promise<
  Array<aggregatedReportedUserType | aggregatedReportedUserArticleType>
> => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const aggregatedReportedUsers: Array<aggregatedReportedUserType> = (
      await db
        .collection(COLL_USER_GENERATED_CONTENTS_USER_REPORTS)
        .aggregate([
          {
            $match: {
              appId,
              userId,
            },
          },
          {
            $lookup: {
              from: COLL_USERS,
              localField: 'reportedUserId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: { 'profile.username': 1, _id: 0 },
                },
                { $set: { username: '$profile.username' } },
                { $unset: 'profile' },
              ],
              as: 'reportedUser',
            },
          },
          {
            $set: {
              reportedUserUsername: '$reportedUser.username',
            },
          },
          { $unset: 'reportedUser' },
          { $unwind: '$reportedUserUsername' },
        ])
        .toArray()
    ).map((reportedUser: aggregatedReportedUserType) => ({
      ...reportedUser,
      type: 'user',
    }));

    const aggregatedReportedUserArticles: Array<aggregatedReportedUserArticleType> =
      (
        await db
          .collection(COLL_USER_GENERATED_CONTENTS_REPORTS)
          .aggregate([
            {
              $match: {
                appId,
                userId,
              },
            },
            {
              $lookup: {
                from: COLL_USER_GENERATED_CONTENTS,
                localField: 'ugcId',
                foreignField: '_id',
                pipeline: [
                  {
                    $project: { 'data.title': 1, _id: 0 },
                  },
                  { $set: { reportedUserArticleTitle: '$data.title' } },
                  { $unset: 'data' },
                ],
                as: 'reportedUserArticle',
              },
            },
            {
              $set: {
                reportedUserArticleTitle:
                  '$reportedUserArticle.reportedUserArticleTitle',
              },
            },
            { $unset: 'reportedUserArticle' },
            { $unwind: '$reportedUserArticleTitle' },
          ])
          .toArray()
      ).map((reportedUserArticle: aggregatedReportedUserArticleType) => ({
        ...reportedUserArticle,
        type: 'userArticle',
      }));

    return (
      aggregatedReportedUsers as Array<
        aggregatedReportedUserType | aggregatedReportedUserArticleType
      >
    ).concat(aggregatedReportedUserArticles);
  } finally {
    client.close();
  }
};
