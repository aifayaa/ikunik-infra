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

    const crowdaaSyncAutoSetupBodySchema = z.object({
      action: z.enum(['setup', 'logout']).default('setup'),
      pluginApiKey: z
        .string({
          required_error: 'pluginApiKey is required',
          invalid_type_error: 'pluginApiKey must be a string',
        })
        .trim(),
      wordpressApiUrl: z
        .string({
          required_error: 'wordpressApiUrl is required',
          invalid_type_error: 'wordpressApiUrl must be a string',
        })
        .url('wordpressApiUrl must be a URL')
        .trim(),
      defaultWordpressUrl: z
        .string({
          required_error: 'defaultWordpressUrl is required',
          invalid_type_error: 'defaultWordpressUrl must be a string',
        })
        .trim()
        .optional(),
      syncDomainNames: z
        .array(
          z
            .string({
              required_error: 'syncDomainNames is required',
              invalid_type_error: 'syncDomainNames must be a string',
            })
            .trim()
        )
        .optional(),
    });

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);
    const validatedBody = crowdaaSyncAutoSetupBodySchema.parse(body);

    const {
      action,
      pluginApiKey,
      wordpressApiUrl,
      defaultWordpressUrl,
      syncDomainNames,
    } = validatedBody;

    await crowdaaSyncWPPluginAutoSetup(appId, {
      action,
      pluginApiKey,
      wordpressApiUrl,
      defaultWordpressUrl,
      syncDomainNames,
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
