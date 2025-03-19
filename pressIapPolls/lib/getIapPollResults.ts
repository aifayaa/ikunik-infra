/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { userPrivateFieldsProjection } from '../../users/lib/usersUtils.js';
import { IapPollPriceIdsType } from './iapPollsTypes.js';

const { COLL_PRESS_IAP_POLLS_VOTES, COLL_USERS } = mongoCollections;

type GetIapPollResultsParamsType = {
  groupBy?: 'articleId' | 'priceId' | 'none';
  start: number | null;
  limit: number | null;
};

type GetIapPollResultsForOutputType = {
  _id: string;
  iapPollId: string;
  priceId: IapPollPriceIdsType | null;
  optionId?: string;
  counts: number;
  votes: number;
  totalPoints: number;
};

export async function getIapPollResultsFor(
  userId: string,
  appId: string,
  iapPollId: string,
  articleId: string,
  deviceId?: string
) {
  const client = await MongoClient.connect();

  try {
    const $match: any = {
      appId,
      iapPollId,
      userId,
    };
    if (userId) {
      $match.userId = userId;
    } else if (deviceId) {
      $match.deviceId = deviceId;
    } else {
      return {};
    }

    if (articleId) $match.articleId = articleId;

    const pipeline: any[] = [
      {
        $match,
      },
    ];

    const resultsForPriceId = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS_VOTES)
      .aggregate([
        ...pipeline,
        {
          $group: {
            _id: '$priceId',

            iapPollId: { $first: '$iapPollId' },
            priceId: { $first: '$priceId' },

            counts: { $sum: '$count' },
            votes: { $sum: 1 },
            totalPoints: { $sum: '$totalPoints' },
          },
        },
      ])
      .toArray()) as GetIapPollResultsForOutputType[];

    const resultsForOptionId = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS_VOTES)
      .aggregate([
        ...pipeline,
        {
          $group: {
            _id: '$optionId',

            iapPollId: { $first: '$iapPollId' },
            optionId: { $first: '$optionId' },

            counts: { $sum: '$count' },
            votes: { $sum: 1 },
            totalPoints: { $sum: '$totalPoints' },
          },
        },
      ])
      .toArray()) as GetIapPollResultsForOutputType[];

    const mappedResults: Record<string, GetIapPollResultsForOutputType> = {};

    resultsForPriceId.forEach((result) => {
      if (result.priceId === null) {
        mappedResults['%FREE%'] = result;
      } else {
        mappedResults[result.priceId] = result;
      }
    });

    resultsForOptionId.forEach((result) => {
      if (result.optionId) {
        mappedResults[result.optionId] = result;
      }
    });

    return mappedResults;
  } finally {
    await client.close();
  }
}

export default async (
  iapPollId: string,
  appId: string,
  {
    start = null,
    limit = null,
    groupBy = 'none',
  }: GetIapPollResultsParamsType = {
    start: null,
    limit: null,
  }
) => {
  const client = await MongoClient.connect();

  try {
    const $match = {
      iapPollId,
      appId,
    };

    const pipeline: any[] = [
      {
        $match,
      },
    ];

    if (groupBy !== 'none') {
      if (groupBy === 'articleId') {
        pipeline.push({
          $group: {
            _id: '$articleId',

            iapPollId: { $first: '$iapPollId' },
            priceIds: { $addToSet: '$priceId' },

            counts: { $sum: '$count' },
            votes: { $sum: 1 },
            totalPoints: { $sum: '$totalPoints' },
          },
        });
      } else if (groupBy === 'priceId') {
        pipeline.push({
          $group: {
            _id: '$priceId',

            iapPollId: { $first: '$iapPollId' },

            counts: { $sum: '$count' },
            votes: { $sum: 1 },
            totalPoints: { $sum: '$totalPoints' },
          },
        });
      }
    }

    if (groupBy === 'none' && start !== null && limit !== null) {
      pipeline.push(
        {
          $skip: start,
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: COLL_USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: userPrivateFieldsProjection }],
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        }
      );
    }

    const votes = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS_VOTES)
      .aggregate(pipeline)
      .toArray();

    const ret = {
      votes,
      totalVotes: null,
    };

    if (groupBy === 'none' && start !== null && limit !== null) {
      const totalVotes = await client
        .db()
        .collection(COLL_PRESS_IAP_POLLS_VOTES)
        .find($match)
        .count();

      ret.totalVotes = totalVotes;
    }

    return ret;
  } finally {
    await client.close();
  }
};
