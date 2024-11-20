/* eslint-disable import/no-relative-packages */
import updateIapPoll from '../lib/updateIapPoll';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { z } from 'zod';
import { IapPollPriceIdsList } from 'pressIapPolls/lib/iapPollsTypes';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

const bodySchema = z
  .object({
    title: z
      .string({
        required_error: 'title is required',
        invalid_type_error: 'title must be a string',
      })
      .trim()
      .min(1)
      .optional(),
    description: z
      .string({
        required_error: 'description is required',
        invalid_type_error: 'description must be a string',
      })
      .trim()
      .optional(),
    startDate: z
      .string({
        required_error: 'startDate is required',
        invalid_type_error: 'startDate must be a string',
      })
      .trim()
      .datetime()
      .transform((x) => new Date(x))
      .optional(),
    endDate: z
      .string({
        required_error: 'endDate is required',
        invalid_type_error: 'endDate must be a string',
      })
      .trim()
      .datetime()
      .transform((x) => new Date(x))
      .optional(),
    options: z
      .array(
        z.object({
          priceId: z.enum(IapPollPriceIdsList),
          points: z.number().int(),
        })
      )
      .optional(),
    displayResults: z.boolean().optional(),
    active: z.boolean().optional(),
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

    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const body = JSON.parse(event.body);

    // validation
    const validatedBody = bodySchema.parse(body);

    const iapPoll = await updateIapPoll(
      iapPollId,
      appId,
      userId,
      validatedBody
    );

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
