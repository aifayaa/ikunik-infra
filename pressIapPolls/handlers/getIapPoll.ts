/* eslint-disable import/no-relative-packages */
import getIapPoll from '../lib/getIapPoll';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { getIapPollResultsFor } from 'pressIapPolls/lib/getIapPollResults';

const urlSchema = z
  .object({
    getResults: z
      .enum(['true', 'false'])
      .transform((x) => x === 'true')
      .optional(),
    articleId: z.string().trim().min(1).optional(),
  })
  .strict();

export default async (event: APIGatewayProxyEvent) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
    superAdmin?: boolean;
  };
  const { id: iapPollId } = event.pathParameters as { id: string };

  try {
    const validatedParams = urlSchema.parse(event.queryStringParameters || {});

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'iapPolls');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    const iapPoll = await getIapPoll(iapPollId, appId);

    if (validatedParams.getResults && validatedParams.articleId) {
      const results = await getIapPollResultsFor(
        userId,
        appId,
        iapPollId,
        validatedParams.articleId
      );

      return response({
        code: 200,
        body: formatResponseBody({
          data: {
            ...iapPoll,
            results,
          },
        }),
      });
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: iapPoll,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
