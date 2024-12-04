/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import leaderboardWpSetup from 'providers/lib/leaderboardWpSetup';
import { filterAppPrivateFields } from '@apps/lib/appsUtils';
import { z } from 'zod';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';

const bodySchema = z
  .object({
    iapPollId: z
      .string({
        required_error: 'iapPollId is required',
        invalid_type_error: 'iapPollId must be a string',
      })
      .trim(),
    defaultPictureId: z
      .string({
        required_error: 'defaultPictureId is required',
        invalid_type_error: 'defaultPictureId must be a string',
      })
      .trim(),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
    };
    await checkPermsForApp(userId, appId, ['admin']);

    const body = JSON.parse(event.body);
    const validatedBody = bodySchema.parse(body);

    const result = await leaderboardWpSetup(userId, appId, validatedBody);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(result),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
