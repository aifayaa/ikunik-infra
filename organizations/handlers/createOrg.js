/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import createOrg from '../lib/createOrg.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    const body = JSON.parse(event.body);

    const createOrgSchema = z.object({
      name: z
        .string({
          required_error: 'name is required',
          invalid_type_error: 'name must be a string',
        })
        .max(80, { message: 'Must be 80 or fewer characters long' })
        .trim(),
      email: z
        .string({
          required_error: 'email is required',
        })
        .email()
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

    let validatedBody;
    // validation
    try {
      validatedBody = createOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { name, email, appleTeamId, appleCompanyName } = validatedBody;
    const org = await createOrg(
      userId,
      name,
      email,
      appleTeamId,
      appleCompanyName
    );
    return response({
      code: 200,
      body: formatResponseBody({ data: org }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
