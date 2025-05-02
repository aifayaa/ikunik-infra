/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  filterAppLiveStreamOutput,
  getVisibleCategoriesForUser,
} from './utils';
import { userPrivateFields } from '../../users/lib/usersUtils';
import { AppLiveStreamType } from './appLiveStreamTypes';
import { UserBadgeType } from 'userBadges/lib/userBadgesEntities';

const { COLL_APP_LIVE_STREAMS, COLL_USERS } = mongoCollections;

type GetLiveStreamsParamsType = {
  id?: string;
  start?: string;
  limit?: string;
  active: boolean | null | undefined;
  users: boolean | null | undefined;
};

export default async (
  appId: string,
  userId: string,
  {
    id,
    start: inputStart,
    limit: inputLimit,
    active = null,
    users = false,
  }: GetLiveStreamsParamsType
) => {
  const $match: Record<string, any> = {
    appId,
  };

  const client = await MongoClient.connect();
  try {
    const visibleCategories = await getVisibleCategoriesForUser(userId, appId);
    const visibleCategoriesHash = visibleCategories.reduce(
      (acc, category) => {
        acc[category._id] = category;
        return acc;
      },
      {} as Record<string, (typeof visibleCategories)[number]>
    );

    $match.categoryId = { $in: [visibleCategories.map(({ _id }) => _id)] };
    // TODO CONTINUE ME LATER

    let pipelineSkipLimit: Array<any> = [];
    let pipelineFetchUsers: Array<any> = [];
    let start: number;
    let limit: number;

    if (id) {
      $match._id = id;
    } else {
      start = (inputStart && parseInt(inputStart, 10)) || 0;
      limit = (inputLimit && parseInt(inputLimit, 10)) || 10;
      pipelineSkipLimit = [{ $skip: start }, { $limit: limit }];
    }

    if (typeof active === 'boolean') {
      $match['state.isStreaming'] = active;
    }

    if (users) {
      pipelineFetchUsers = [
        {
          $lookup: {
            from: COLL_USERS,
            localField: 'createdBy',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: userPrivateFields.reduce(
            (acc, field) => {
              acc[`user.${field}`] = 0;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      ];
    }

    const pipeline = [
      { $match },
      {
        $sort: {
          createdAt: -1,
          name: 1,
        },
      },
      ...pipelineFetchUsers,
      ...pipelineSkipLimit,
    ];

    let list = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .aggregate(pipeline)
      .toArray();
    list = list.map((item: AppLiveStreamType & { user: {} }) => {
      let missingBadges: Array<UserBadgeType> = [];
      let previewOnly = false;
      if (visibleCategoriesHash[item.categoryId]) {
        missingBadges = visibleCategoriesHash[item.categoryId].missingBadges;
        previewOnly = visibleCategoriesHash[item.categoryId].previewOnly;
      }
      return {
        ...filterAppLiveStreamOutput(item, userId === item.createdBy),
        user: item.user,
        missingBadges,
        previewOnly,
      };
    });

    const count = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .find($match, { projection: { _id: 1 } })
      .count();

    return { list, count };
  } finally {
    await client.close();
  }
};
