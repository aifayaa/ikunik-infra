/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { checkPermsIsSuperAdmin } from '../../libs/perms/checkPermsFor';
import openSessionAs, { OpenSessionAsType } from '../lib/openSessionAs';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer as {
    principalId: string;
  };

  try {
    const openSessionAsSchema = z.union([
      z
        .object({
          email: z
            .string({
              required_error: 'email is required',
              invalid_type_error: 'email must be a string',
            })
            .trim(),
        })
        .required(),
      z
        .object({
          id: z
            .string({
              required_error: 'id is required',
              invalid_type_error: 'id must be a string',
            })
            .trim(),
        })
        .required(),
    ]);
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
      validatedBody = openSessionAsSchema.parse(body) as OpenSessionAsType;
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    await checkPermsIsSuperAdmin(sourceUserId);

    const { email, id } = validatedBody;

    const sessionData = await openSessionAs({ email, id });

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
