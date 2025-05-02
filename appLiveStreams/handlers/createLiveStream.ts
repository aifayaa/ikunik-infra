/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.js';
import { createAppLiveStream } from '../lib/createLiveStream.js';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.js';
import { filterAppLiveStreamOutput } from '../lib/utils.js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes.js';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError.js';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';

const bodySchema = z
  .object({
    categoryId: z.string({
      required_error: 'categoryId is required',
      invalid_type_error: 'categoryId must be a string',
    }),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
    };

    try {
      await checkFeaturePermsForApp(userId, appId, ['appLiveStreaming']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const body = JSON.parse(event.body);

    const validatedBody = bodySchema.parse(body);

    const results = await createAppLiveStream(appId, {
      userId,
      ...validatedBody,
    });
    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppLiveStreamOutput(results, true),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
