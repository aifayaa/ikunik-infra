/* eslint-disable import/no-relative-packages */
import patchAppTranslations, {
  APPS_LANGS,
  APPS_LANGS_TYPE,
} from '../lib/patchAppTranslations';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { z } from 'zod';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { filterAppPrivateFields } from '../../apps/lib/appsUtils';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = (event.requestContext || {}).authorizer || {};
  const appId = event.pathParameters?.id;

  try {
    if (!appId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        `Path parameter appId is not defined: '${appId}'`
      );
    }

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const patchAppTranslationsSchema = z.object({
      fr: z.object({}).catchall(z.union([z.string(), z.null()])),
      en: z.object({}).catchall(z.union([z.string(), z.null()])),
    });

    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = patchAppTranslationsSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const app = await patchAppTranslations(appId, validatedBody);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(app),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
