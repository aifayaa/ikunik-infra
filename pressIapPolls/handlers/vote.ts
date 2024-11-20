/* eslint-disable import/no-relative-packages */
import addVote from '../lib/addVote';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { IapPollPriceIdsList } from 'pressIapPolls/lib/iapPollsTypes';

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
    priceId: z.enum(IapPollPriceIdsList),
    count: z.number().int().gte(1).default(1).optional(),
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
      throw new Error('mal_formed_request');
    }

    const body = JSON.parse(event.body);

    // validation
    const validatedBody = bodySchema.parse(body);

    const voted = await addVote(iapPollId, appId, userId, validatedBody);
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
