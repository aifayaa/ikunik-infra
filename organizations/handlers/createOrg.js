/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { returnedFieldsFilter } from '../lib/fieldsChecks';
import createOrg from '../lib/createOrg';

export const createOrgSchema = z
  .object({
    name: z
      .string({
        required_error: 'name is required',
        invalid_type_error: 'name must be a string',
      })
      .max(80, { message: 'Must be 80 or fewer characters long' })
      .trim(),
  })
  .required();

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

    const org = await createOrg(userId, validatedBody);
    return response({
      code: 200,
      body: formatResponseBody({ data: returnedFieldsFilter(org) }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
