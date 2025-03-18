/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  IapPollOptionType,
  IapPollPriceIdsType,
  IapPollType,
} from './iapPollsTypes';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  IAP_POLL_AFTER_END_CODE,
  IAP_POLL_ALREADY_VOTED_CODE,
  IAP_POLL_BEFORE_START_CODE,
  IAP_POLL_DISABLED_CODE,
  IAP_POLL_FREE_QUOTA_EXCEEDED_CODE,
  IAP_POLL_OPTION_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { ArticlePrices } from 'pressArticles/articlePrices';
import { getIapPollResultsFor } from './getIapPollResults';

const { COLL_PRESS_IAP_POLLS_VOTES } = mongoCollections;

type VoteParamType = {
  articleId: string;
  deviceId: string;
  priceId: IapPollPriceIdsType | null;
  count: number;
  optionId?: string;
};

export async function canUserVoteForFree(
  appId: string,
  userId: string,
  iapPollId: string,
  articleId: string,
  option: IapPollOptionType | null
) {
  const client = await MongoClient.connect();

  try {
    if (!userId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        IAP_POLL_ALREADY_VOTED_CODE,
        'You cannot vote for free'
      );
    }

    if (
      option &&
      option.optionId &&
      !option.priceId &&
      typeof option.maxVotesPerUserPerArticle === 'number' &&
      option.maxVotesPerUserPerArticle > 0
    ) {
      const results = await getIapPollResultsFor(
        userId,
        appId,
        iapPollId,
        articleId
      );

      if (results[option.optionId]) {
        if (
          results[option.optionId].counts >= option.maxVotesPerUserPerArticle
        ) {
          throw new CrowdaaError(
            ERROR_TYPE_NOT_ALLOWED,
            IAP_POLL_FREE_QUOTA_EXCEEDED_CODE,
            `You used all of your free vote quota on this option '${iapPollId}'/'${option.optionId}'`
          );
        }
      }
    } else {
      const votedForFree = await client
        .db()
        .collection(COLL_PRESS_IAP_POLLS_VOTES)
        .findOne({
          appId,
          iapPollId,
          articleId,
          userId,
          priceId: null,
        });

      if (votedForFree) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          IAP_POLL_ALREADY_VOTED_CODE,
          `You already used your free vote on this poll '${iapPollId}'`
        );
      }
    }
  } finally {
    await client.close();
  }
}

export function checkIsIapPollVotableAndGetOption(
  iapPoll: IapPollType,
  priceId: IapPollPriceIdsType | null,
  optionId: string | undefined
) {
  const now = new Date();
  const { active, startDate, endDate } = iapPoll;

  if (!active) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      IAP_POLL_DISABLED_CODE,
      `The IAP poll '${iapPoll._id}' is disabled`
    );
  } else if (startDate > now) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      IAP_POLL_BEFORE_START_CODE,
      `The IAP poll '${iapPoll._id}' is not started yet`
    );
  } else if (endDate < now) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      IAP_POLL_AFTER_END_CODE,
      `The IAP poll '${iapPoll._id}' ended`
    );
  }

  if (priceId === null && !optionId) {
    return null;
  }

  const option = iapPoll.options.find(
    (option) =>
      (optionId && optionId == option.optionId) || option.priceId === priceId
  );

  if (!option) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      IAP_POLL_OPTION_NOT_FOUND_CODE,
      `The option ${optionId} / ${priceId} was not found on IAP poll '${iapPoll._id}'`
    );
  }

  if (option.priceId) {
    if (!ArticlePrices[option.priceId as IapPollPriceIdsType]) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_OPTION_NOT_FOUND_CODE,
        `The option ${optionId} /${priceId} was not found on IAP poll '${iapPoll._id}'`
      );
    }
  }

  return option;
}

export default async (
  iapPoll: IapPollType,
  appId: string,
  userId: string | null,
  { articleId, deviceId, optionId, priceId, count = 1 }: VoteParamType
) => {
  const client = await MongoClient.connect();

  try {
    let points;
    let totalPoints;

    if (optionId) {
      const option = iapPoll.options.find(
        (option) => option.optionId === optionId
      );
      if (!option) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_FOUND,
          IAP_POLL_OPTION_NOT_FOUND_CODE,
          `The option ${optionId} was not found on IAP poll '${iapPoll._id}'`
        );
      }

      points = option.points;
      totalPoints = points * count;
    } else if (priceId === null) {
      points = 1;
      totalPoints = 1;
    } else {
      const option = iapPoll.options.find(
        (option) => option.priceId === priceId
      );
      if (!option) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_FOUND,
          IAP_POLL_OPTION_NOT_FOUND_CODE,
          `The option ${priceId} was not found on IAP poll '${iapPoll._id}'`
        );
      }

      points = option.points;
      totalPoints = points * count;
    }

    await client.db().collection(COLL_PRESS_IAP_POLLS_VOTES).insertOne({
      appId,
      iapPollId: iapPoll._id,
      articleId,
      userId,
      deviceId,
      priceId,
      optionId,
      count,
      points,
      totalPoints,
    });

    return totalPoints;
  } finally {
    await client.close();
  }
};
