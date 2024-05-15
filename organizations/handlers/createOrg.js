/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import createOrg from '../lib/createOrg';

export const createOrgSchema = z.object({
  name: z
    .string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    })
    .max(80, { message: 'Must be 80 or fewer characters long' })
    .trim(),
  appleTeamId: z
    .string({
      invalid_type_error: 'appleTeamId must be a string',
    })
    .length(10, { message: 'Must be 10 characters long' })
    .trim()
    .optional(),
  appleCompanyName: z
    .string({
      invalid_type_error: 'appleCompanyName must be a string',
    })
    .min(1, { message: 'Must be at least 1 character long' })
    .max(100, { message: 'Must be at most 100 character long' }) // Arbitrary length
    .trim()
    .optional(),
});

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = createOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { name, appleTeamId, appleCompanyName } = validatedBody;
    const org = await createOrg(userId, name, appleTeamId, appleCompanyName);
    return response({
      code: 200,
      body: formatResponseBody({ data: org }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
