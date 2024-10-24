/* eslint-disable import/no-relative-packages */
import bookBookable from '../lib/bookBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';

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

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
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
