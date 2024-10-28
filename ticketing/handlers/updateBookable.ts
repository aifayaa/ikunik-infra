/* eslint-disable import/no-relative-packages */
import updateBookable from '../lib/updateBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';

export const updateBookableSchema = z
  .object({
    name: z
      .string({
        required_error: 'name is required',
        invalid_type_error: 'name must be a string',
      })
      .min(1, { message: 'Must be 1 or more characters long' })
      .max(80, { message: 'Must be 80 or fewer characters long' })
      .trim(),
    description: z
      .string({
        invalid_type_error: 'description must be a string',
      })
      .max(2000, { message: 'Must be 2000 or fewer characters long' })
      .trim(),
    disabled: z.boolean(),
    'limits.notBefore': z
      .string({
        required_error: 'limits.notBefore is required',
        invalid_type_error: 'limits.notBefore must be a string',
      })
      .regex(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/,
        {
          message: 'Must be a date format',
        }
      )
      .trim()
      .transform((x) => new Date(x)),
    'limits.notAfter': z
      .string({
        required_error: 'limits.notAfter is required',
        invalid_type_error: 'limits.notAfter must be a string',
      })
      .regex(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/,
        {
          message: 'Must be a date format',
        }
      )
      .trim()
      .transform((x) => new Date(x)),
    'limits.maxTickets': z.number().int().gte(0),
    'limits.maxTicketsPerAccount': z.number().int().gte(1),
    pricingId: z.string().or(z.null()),
    pictureId: z.string().or(z.null()),
  })
  .strict();

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: bookableId } = event.pathParameters as { id: string };

  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const body = JSON.parse(event.body);

    const validatedBody = updateBookableSchema
      .partial({
        name: true,
        description: true,
        disabled: true,
        'limits.notBefore': true,
        'limits.notAfter': true,
        'limits.maxTickets': true,
        'limits.maxTicketsPerAccount': true,
        pricingId: true,
        pictureId: true,
      })
      .parse(body);

    const newBookable = await updateBookable(
      bookableId,
      appId,
      userId,
      validatedBody
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: newBookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
