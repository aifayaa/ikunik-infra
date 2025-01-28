/* eslint-disable import/no-relative-packages */
import addVote, {
  canUserVoteForFree,
  checkIsIapPollVotableAndGetOption,
} from '../lib/addVote';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import getIapPoll from 'pressIapPolls/lib/getIapPoll';
import {
  IapPollPriceIdsList,
  IapPollPriceIdsType,
} from 'pressIapPolls/lib/iapPollsTypes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { addBalance } from '../../userBalances/lib/addBalance';
import { getBalance } from '../../userBalances/lib/getBalance';
import {
  ERROR_TYPE_IAP,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
  INSUFFICIENT_BALANCE_FUNDS_CODE,
  BALANCE_UPDATE_FAILED_CODE,
} from '@libs/httpResponses/errorCodes';
import { ArticlePrices } from 'pressArticles/articlePrices';

const bodySchema = z
  .object({
    articleId: z
      .string({
        required_error: 'articleId is required',
        invalid_type_error: 'articleId must be a string',
      })
      .trim()
      .min(1),
    deviceId: z
      .string({
        required_error: 'deviceId is required',
        invalid_type_error: 'deviceId must be a string',
      })
      .trim()
      .min(1),
    priceId: z.enum(IapPollPriceIdsList).or(z.null()),
    count: z.number().int().gte(1).optional().default(1),
  })
  .strict();

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: iapPollId } = event.pathParameters as { id: string };

  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const body = JSON.parse(event.body);

    const validatedBody = bodySchema.parse(body);

    const iapPoll = await getIapPoll(iapPollId, appId);
    const option = checkIsIapPollVotableAndGetOption(
      iapPoll,
      validatedBody.priceId
    );

    if (option === null) {
      await canUserVoteForFree(
        appId,
        userId,
        iapPollId,
        validatedBody.articleId
      );
    } else {
      const price =
        ArticlePrices[option.priceId as IapPollPriceIdsType] *
        validatedBody.count;

      const balance = await getBalance(appId, userId, validatedBody.deviceId);

      if (!balance || price > balance.amount) {
        throw new CrowdaaError(
          ERROR_TYPE_IAP,
          INSUFFICIENT_BALANCE_FUNDS_CODE,
          `Insufficient funds to validate purchase for price ${validatedBody.priceId} (balance: ${balance})`
        );
      }

      const operationStatus = await addBalance(
        appId,
        userId,
        validatedBody.deviceId,
        price * -1
      );
      if (!operationStatus) {
        throw new CrowdaaError(
          ERROR_TYPE_IAP,
          BALANCE_UPDATE_FAILED_CODE,
          `Balance update failed for app ${appId}, user ${userId}, device ${validatedBody.deviceId} (balance: ${balance}, operation: ${price * -1})`
        );
      }
    }

    const voted = await addVote(iapPoll, appId, userId, validatedBody);
    return response({
      code: 200,
      body: formatResponseBody({
        data: voted,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
