import { getApp } from '@apps/lib/appsUtils';
import { putComputeActiveUsersForDay } from '@apps/lib/putComputeActiveUsersForDay';
import MongoClient from '@libs/mongoClient.js';
import {
  type PutComputeActiveUsersForDaySchema,
  putComputeActiveUsersForDaySchema,
} from '@apps/validators/putComputeActiveUsersForDay.schema';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { formatValidationErrors } from '@libs/httpResponses/formatValidationErrors';
import response, { handleException } from '@libs/httpResponses/response';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';

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

let client: any; // TODO type
let db: any; // TODO type

export default async (event: PutComputeActiveUsersForDayLambdaEvent) => {
  if (!client) client = await MongoClient.connect();
  if (!db) db = client.db();
  let appId: string | undefined;
  let day: Date;

  try {
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

      let validatedBody: PutComputeActiveUsersForDaySchema = JSON.parse(
        event.body
      );
      validatedBody.appId = appId;

      try {
        validatedBody = putComputeActiveUsersForDaySchema.parse(validatedBody);
        day = new Date(validatedBody.day);
      } catch (exception) {
        return formatValidationErrors(exception);
      }
      await checkPermsForApp(userId, appId, ['admin']);
    } else {
      // the function is directly invoked
      let validatedComputeParameters: PutComputeActiveUsersForDaySchema;

      try {
        validatedComputeParameters =
          putComputeActiveUsersForDaySchema.parse(event);
        appId = validatedComputeParameters.appId;
        day = new Date(validatedComputeParameters.day);
      } catch (exception) {
        return formatValidationErrors(exception);
      }
    }

    const app = await getApp(appId);

    const count = await putComputeActiveUsersForDay({
      appId,
      subscriptionId: app.stripe?.subscriptionId,
      day,
      db
    });
    return response({ code: 200, body: { count } });
  } catch (err) {
    handleException(err);
  } finally {
    await client.close();
  }
};
