/* eslint-disable import/no-relative-packages */
import getIapPollResults from '../lib/getIapPollResults';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { checkAppPlanForLimitAccess } from 'appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_FORBIDDEN,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_INPUT_FORMAT_CODE,
  INVALID_TOKEN_CODE,
} from '@libs/httpResponses/errorCodes';
import getIapPoll from 'pressIapPolls/lib/getIapPoll';
import { z } from 'zod';

type IapPollGetVarFiltersType = {
  start?: number | string | null;
  limit?: number | string | null;
  exportToken?: string | null;
  format?: 'json' | 'csv';
  groupBy?: 'articleId' | 'priceId' | 'none';
};

const urlArgsSchema = z
  .object({
    start: z
      .string()
      .trim()
      .optional()
      .transform((x) => (x ? parseInt(x, 10) || 0 : null)),
    limit: z
      .string()
      .trim()
      .optional()
      .transform((x) => (x ? parseInt(x, 10) || 25 : null)),
    exportToken: z.string().trim().optional(),
    format: z.enum(['json', 'csv']).optional().default('json'),
    groupBy: z
      .enum(['articleId', 'priceId', 'none'])
      .optional()
      .default('none'),
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
  let {
    start,
    limit,
    exportToken = null,
    format = 'json',
    groupBy = 'none',
  }: IapPollGetVarFiltersType = urlArgsSchema.parse(
    event.queryStringParameters || {}
  );

  try {
    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

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

    if (!superAdmin && !isAdmin) {
      if (!!exportToken) {
        throw new CrowdaaError(
          ERROR_TYPE_ACCESS,
          APPLICATION_PERMISSION_CODE,
          `User '${userId}' does not have sufficient permissions to do this operation`
        );
      } else {
        const iapPoll = await getIapPoll(iapPollId, appId);

        if (iapPoll.exportToken !== exportToken) {
          throw new CrowdaaError(
            ERROR_TYPE_FORBIDDEN,
            INVALID_TOKEN_CODE,
            `Invalid token ${exportToken} provided for export`
          );
        }
      }
    }

    const iapPollResults = await getIapPollResults(iapPollId, appId, {
      start,
      limit,
      groupBy,
    });

    if (format === 'json') {
      return response({
        code: 200,
        body: formatResponseBody({
          data: iapPollResults,
        }),
      });
    } else if (format === 'csv') {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_INPUT_FORMAT_CODE,
        `Format 'csv' not handled yet!`
      );
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_INPUT_FORMAT_CODE,
        `Unknown format '${format}'`
      );
    }
  } catch (exception) {
    return handleException(exception);
  }
};
