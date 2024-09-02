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
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { z } from 'zod';
import { filterAppPrivateFields } from '../../apps/lib/appsUtils';
import { checkAppPlanForLimitAccess } from 'appsFeaturePlans/lib/checkAppPlanForLimits';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, superAdmin } = event.requestContext
    .authorizer as {
    principalId: string;
    superAdmin?: boolean;
  };
  const appId = event.pathParameters?.id;

  try {
    if (!appId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        `Path parameter appId is not defined: '${appId}'`
      );
    }

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'translations');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
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

    // validation
    const validatedBody = patchAppTranslationsSchema.parse(body);

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
