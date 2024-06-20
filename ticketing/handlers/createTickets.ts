/* eslint-disable import/no-relative-packages */
import createTickets from '../lib/createTickets';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';

export const createBookableSchema = z.object({
  bookableId: z
    .string({
      required_error: 'bookableId is required',
      invalid_type_error: 'bookableId must be a string',
    })
    .min(1, { message: 'Must be 1 or more characters long' })
    .max(80, { message: 'Must be 80 or fewer characters long' })
    .trim(),
  count: z
    .number({
      required_error: 'count is required',
    })
    .int()
    .min(1)
    .max(100),
});

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = createBookableSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { bookableId, count } = validatedBody;

    const newTicket = await createTickets(appId, userId, bookableId, count);

    return response({
      code: 200,
      body: formatResponseBody({
        data: newTicket,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
