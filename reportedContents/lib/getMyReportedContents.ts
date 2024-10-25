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

type reportedCommentOrUserArticleType = {
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
  | reportedCommentOrUserArticleType
  | { type: reportType; reportedUserArticleTitle: string | undefined };

type aggregatedReportedCommentType =
  | reportedCommentOrUserArticleType
  | {
      type: reportType;
      reportedCommentContent: string | undefined;
      reportedCommentAuthorUserId: string | undefined;
      reportedCommentAuthorUsername: string | undefined;
    };

type aggregatedResult =
  | aggregatedReportedUserType
  | aggregatedReportedUserArticleType
  | aggregatedReportedCommentType;

export default async (
  userId: string,
  { appId }: { appId: string }
): Promise<Array<aggregatedResult>> => {
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

    const unfiltedReportedContent = await db
      .collection(COLL_USER_GENERATED_CONTENTS_REPORTS)
      .aggregate([
        {
          $match: {
            appId,
            userId,
          },
        },
      ])
      .toArray();

    console.log('unfiltedReportedContent', unfiltedReportedContent);

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
                  { $match: { type: 'article' } },
                  {
                    $project: { 'data.title': 1, _id: 0 },
                  },
                  { $set: { title: '$data.title' } },
                  { $unset: 'data' },
                ],
                as: 'reportedUserArticle',
              },
            },
            {
              $set: {
                reportedUserArticleTitle: '$reportedUserArticle.title',
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

    const aggregatedReportedComments: Array<aggregatedReportedCommentType> = (
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
                { $match: { type: 'comment' } },
                {
                  $project: { data: 1, userId: 1, _id: 0 },
                },
                {
                  $set: {
                    content: '$data',
                    authorUserId: '$userId',
                  },
                },
                { $unset: ['data', 'userId'] },
              ],
              as: 'reportedComment',
            },
          },
          {
            $set: {
              reportedCommentContent: '$reportedComment.content',
              reportedCommentAuthorUserId: '$reportedComment.authorUserId',
            },
          },
          { $unset: 'reportedComment' },
          { $unwind: '$reportedCommentContent' },
          { $unwind: '$reportedCommentAuthorUserId' },
          {
            $lookup: {
              from: COLL_USERS,
              localField: 'reportedCommentAuthorUserId',
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
              reportedCommentAuthorUsername: '$reportedUser.username',
            },
          },
          { $unwind: '$reportedCommentAuthorUsername' },
          { $unset: 'reportedUser' },
        ])
        .toArray()
    ).map((reportedUserArticle: aggregatedReportedUserArticleType) => ({
      ...reportedUserArticle,
      type: 'comment',
    }));

    return (aggregatedReportedUsers as Array<aggregatedResult>)
      .concat(aggregatedReportedUserArticles)
      .concat(aggregatedReportedComments);
  } finally {
    client.close();
  }
};
