/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import crowdaaSyncWPPluginAutoSetup from '../lib/crowdaaSyncWPPluginAutoSetup';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const createLegalBodySchema = z
      .object({
        pluginApiKey: z
          .string({
            required_error: 'pluginApiKey is required',
            invalid_type_error: 'pluginApiKey must be a string',
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
    const validatedBody = createLegalBodySchema.parse(body);

    const { pluginApiKey } = validatedBody;

    await crowdaaSyncWPPluginAutoSetup(appId, {
      pluginApiKey,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: { ok: true },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
