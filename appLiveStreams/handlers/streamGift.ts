/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import response, { handleException } from '../../libs/httpResponses/response';
import streamGift from '../lib/streamGift';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { ArticlePricesKeys } from 'pressArticles/articlePrices';

const bodySchema = z
  .object({
    // productId: z.string({
    //   required_error: 'productId is required',
    //   invalid_type_error: 'productId must be a string',
    // }),
    productId: z.enum(ArticlePricesKeys),
    deviceId: z.string({
      required_error: 'deviceId is required',
      invalid_type_error: 'deviceId must be a string',
    }),
    amountInCurrency: z.string({
      required_error: 'amountInCurrency is required',
      invalid_type_error: 'amountInCurrency must be a string',
    }),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string | null;
    };
    const { id: liveStreamId } = event.pathParameters as { id: string };

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const body = JSON.parse(event.body);

    const { deviceId, productId, amountInCurrency } = bodySchema.parse(body);

    const results = await streamGift(
      appId,
      liveStreamId,
      deviceId,
      userId,
      productId,
      amountInCurrency
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: results,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
