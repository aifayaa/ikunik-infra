/* eslint-disable import/no-relative-packages */
import createIapPoll from '../lib/createIapPoll';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import mongoCollections from '../../libs/mongoCollections.json';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { getApp } from '../../apps/lib/appsUtils';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import { IapPollPriceIdsList } from 'pressIapPolls/lib/iapPollsTypes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

const bodySchema = z
  .object({
    title: z
      .string({
        required_error: 'title is required',
        invalid_type_error: 'title must be a string',
      })
      .trim()
      .min(1),
    description: z
      .string({
        required_error: 'description is required',
        invalid_type_error: 'description must be a string',
      })
      .trim()
      .default(''),
    startDate: z
      .string({
        required_error: 'startDate is required',
        invalid_type_error: 'startDate must be a string',
      })
      .trim()
      .datetime()
      .transform((x) => new Date(x)),
    endDate: z
      .string({
        required_error: 'endDate is required',
        invalid_type_error: 'endDate must be a string',
      })
      .trim()
      .datetime()
      .transform((x) => new Date(x)),
    options: z.array(
      z.object({
        priceId: z.enum(IapPollPriceIdsList),
        points: z.number().int(),
        maxVotesPerUserPerArticle: z.number().int().optional().default(0),
      })
    ),
    displayResults: z.boolean(),
    active: z.boolean(),
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

  try {
    if (!superAdmin) {
      const app = await getApp(appId);
      const allowed = await checkAppPlanForLimitIncrease(
        app,
        'iapPolls',
        async () => {
          const client = await MongoClient.connect();

          try {
            const count = await client
              .db()
              .collection(COLL_PRESS_IAP_POLLS)
              .find({ appId })
              .count();

            return count;
          } finally {
            client.close();
          }
        }
      );
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

    const options = validatedBody.options.map((option) => ({
      ...option,
      optionId: ObjectID().toString(),
    }));

    const newIapPoll = await createIapPoll(appId, userId, {
      ...validatedBody,
      options,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: newIapPoll,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
