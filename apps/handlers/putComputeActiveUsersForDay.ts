/*eslint allowUnreachableCode: "true"*/
import { z } from 'zod';
import { getApp } from '@apps/lib/appsUtils';
import { putComputeActiveUsersForDay } from '@apps/lib/putComputeActiveUsersForDay';
import MongoClient from '@libs/mongoClient.js';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import response, { handleException } from '@libs/httpResponses/response';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { trowExceptionUntestedCode20240808 } from '@apps/lib/utils';

type PutComputeActiveUsersForDayLambdaParams = {
  appId: string;
  day: Date;
};

type PutComputeActiveUsersForDayLambdaEvent =
  | APIGatewayProxyEvent
  | PutComputeActiveUsersForDayLambdaParams;

function isAPIGatewayProxyEvent(
  event: PutComputeActiveUsersForDayLambdaEvent
): event is APIGatewayProxyEvent {
  return (event as APIGatewayProxyEvent).httpMethod !== undefined;
}

export default async (event: PutComputeActiveUsersForDayLambdaEvent) => {
  const client = await MongoClient.connect();

  const putComputeActiveUsersForDaySchema = z
    .object({
      day: z.string().datetime(),
      appId: z
        .string({
          required_error: 'appId is required',
          invalid_type_error: 'appId must be a string',
        })
        .max(100, { message: 'Must be 100 or fewer characters long' }),
    })
    .strict();

  type PutComputeActiveUsersForDayType = z.infer<
    typeof putComputeActiveUsersForDaySchema
  >;

  try {
    // This code is not executed
    trowExceptionUntestedCode20240808();

    const db = client.db();
    let appId: string | undefined;
    let day: Date;

    if (isAPIGatewayProxyEvent(event)) {
      // the function is http called
      const { principalId: userId } =
        (event.requestContext || {}).authorizer || {};
      appId = event.pathParameters?.id;

      if (!event.body) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_BODY_CODE,
          `Body is missing from the request`
        );
      }

      if (!appId) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_APPLICATION_CODE,
          `Path parameter appId is not defined: '${appId}'`
        );
      }

      let validatedBody: z.infer<typeof putComputeActiveUsersForDaySchema> =
        JSON.parse(event.body);
      validatedBody.appId = appId;

      validatedBody = putComputeActiveUsersForDaySchema.parse(validatedBody);
      day = new Date(validatedBody.day);

      await checkPermsForApp(userId, appId, ['admin']);
    } else {
      // the function is directly invoked
      const validatedComputeParameters: PutComputeActiveUsersForDayType =
        putComputeActiveUsersForDaySchema.parse(event);
      appId = validatedComputeParameters.appId;
      day = new Date(validatedComputeParameters.day);
    }

    const app = await getApp(appId);

    const count = await putComputeActiveUsersForDay({
      appId,
      subscriptionId: app.stripe?.subscription?.id,
      day,
      db,
    });
    return response({ code: 200, body: { count } });
  } catch (exception) {
    return handleException(exception);
  } finally {
    await client.close();
  }
};
