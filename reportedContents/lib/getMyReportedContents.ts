/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { reportType } from './type';

const { COLL_USER_GENERATED_CONTENTS_USER_REPORTS, COLL_USERS } =
  mongoCollections;

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

type aggregatedReportedUserType =
  | reportedUserType
  | { type: reportType; reportedUserUsername: string | undefined };

export default async (userId: string, { appId }: { appId: string }) => {
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

    return aggregatedReportedUsers;
  } finally {
    client.close();
  }
};
