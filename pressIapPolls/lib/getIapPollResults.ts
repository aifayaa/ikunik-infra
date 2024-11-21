/* eslint-disable import/no-relative-packages */
import Random from '../../libs/account_utils/random.js';
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { userPrivateFieldsProjection } from '../../users/lib/usersUtils.js';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError.js';
import {
  ERROR_TYPE_NOT_FOUND,
  IAP_POLL_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes.js';

const { COLL_PRESS_IAP_POLLS, COLL_PRESS_IAP_POLLS_VOTES, COLL_USERS } =
  mongoCollections;

type GetIapPollResultsParamsType = {
  exportToken?: null;
  groupBy?: 'articleId' | 'priceId' | 'none';
  start: number | null;
  limit: number | null;
};

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
    const iapPoll = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({ _id: iapPollId, appId });

    if (!iapPoll) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_NOT_FOUND_CODE,
        `The IAP Poll '${iapPollId}' was not found`
      );
    }

    const exportToken = iapPoll.exportToken || Random.id(24);
    if (!iapPoll.exportToken) {
      await client.db().collection(COLL_PRESS_IAP_POLLS).updateOne(
        { _id: iapPollId, appId },
        {
          $set: { exportToken },
        }
      );
    }

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
        }
      );
    }

    pipeline.push(
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

    const votes = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS_VOTES)
      .aggregate(pipeline)
      .toArray();

    const ret = {
      exportToken,
      iapPoll,
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
    client.close();
  }
};
