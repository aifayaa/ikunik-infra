/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { checkPermsIsSuperAdmin } from '../../libs/perms/checkPermsFor';
import openSessionAs from '../lib/openSessionAs';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';

/**
 * As the source user must be an 'admin' of the application, he can give
 * any roles to the target user.
 */
export default async (event: APIGatewayProxyEvent) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer as {
    principalId: string;
  };

  try {
    const openSessionAsSchema = z
      .object({
        email: z
          .string({
            required_error: 'email is required',
            invalid_type_error: 'email must be a string',
          })
          .trim(),
      })
      .required();

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    let validatedBody;
    try {
      validatedBody = openSessionAsSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    await checkPermsIsSuperAdmin(sourceUserId);

    const { email } = validatedBody;

    const sessionData = await openSessionAs(email);

    return response({
      code: 200,
      body: formatResponseBody({
        data: sessionData,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
