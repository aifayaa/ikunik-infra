/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollPriceIdsType, IapPollType } from './iapPollsTypes';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  IAP_POLL_AFTER_END_CODE,
  IAP_POLL_BEFORE_START_CODE,
  IAP_POLL_DISABLED_CODE,
  IAP_POLL_NOT_FOUND_CODE,
  IAP_POLL_OPTION_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { ArticlePrices } from 'pressArticles/articlePrices';

const { COLL_PRESS_IAP_POLLS, COLL_PRESS_IAP_POLLS_VOTES } = mongoCollections;

type VoteParamType = {
  articleId: string;
  deviceId: string;
  priceId: IapPollPriceIdsType;
  count: number;
};

export function checkIsIapPollVotableAndGetOption(
  iapPoll: IapPollType,
  priceId: string
) {
  const option = iapPoll.options.find((option) => option.priceId === priceId);

  if (!option) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      IAP_POLL_OPTION_NOT_FOUND_CODE,
      `The option ${priceId} was not found on IAP poll '${iapPoll._id}'`
    );
  }

  if (!ArticlePrices[option.priceId as IapPollPriceIdsType]) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      IAP_POLL_OPTION_NOT_FOUND_CODE,
      `The option ${priceId} was not found on IAP poll '${iapPoll._id}'`
    );
  }

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

  return option;
}

export default async (
  iapPollId: string,
  appId: string,
  userId: string | null,
  { articleId, deviceId, priceId, count = 1 }: VoteParamType
) => {
  const client = await MongoClient.connect();

  try {
    const iapPoll = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({
        _id: iapPollId,
        appId,
      })) as IapPollType;

    if (!iapPoll) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_NOT_FOUND_CODE,
        `The IAP Poll '${iapPollId}' was not found`
      );
    }

    const option = iapPoll.options.find((option) => option.priceId === priceId);
    if (!option) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_OPTION_NOT_FOUND_CODE,
        `The option ${priceId} was not found on IAP poll '${iapPollId}'`
      );
    }

    const { points } = option;

    const totalPoints = points * count;

    await client.db().collection(COLL_PRESS_IAP_POLLS_VOTES).insertOne({
      appId,
      iapPollId,
      articleId,
      userId,
      deviceId,
      priceId,
      count,
      points,
      totalPoints,
    });

    return totalPoints;
  } finally {
    client.close();
  }
};
