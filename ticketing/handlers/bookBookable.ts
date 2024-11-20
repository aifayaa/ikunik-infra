/* eslint-disable import/no-relative-packages */
import bookBookable from '../lib/bookBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';

export const bookBookableUrlSchema = z.object({
  id: z
    .string({
      required_error: 'bookable id is required',
      invalid_type_error: 'bookable id must be a string',
    })
    .trim(),
});

export const bookBookableBodySchema = z.object({
  count: z
    .number({
      required_error: 'count is required',
    })
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(1),
});

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    const body = JSON.parse(event.body);

    const { id: bookableId } = bookBookableUrlSchema.parse(
      event.pathParameters
    );

    const validatedBody = bookBookableBodySchema.parse(body);

    const { count } = validatedBody;

    const newTickets = await bookBookable(appId, userId, bookableId, count);

    return response({
      code: 200,
      body: formatResponseBody({
        data: newTickets,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
