import { APIGatewayProxyEvent, EventBridgeEvent } from 'aws-lambda';
import response, { handleException } from '@libs/httpResponses/response';
import { triggerComputeActiveUsers } from '@apps/lib/triggerComputeActiveUsers';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '@libs/mongoClient.js';
import mongoCollections from '@libs/mongoCollections.json';
import { isUserSuperAdmin } from '@libs/perms/checkPermsFor';

import {
  ERROR_TYPE_NOT_ALLOWED,
  NOT_ENOUGH_PERMISSIONS_CODE,
} from '@libs/httpResponses/errorCodes';
import { UserType } from '@users/lib/userEntity';
import { trowExceptionUntestedCode20240808 } from '@apps/lib/utils';
const { COLL_USERS } = mongoCollections;

type ResponseBody = {
  status: 'done' | 'error';
  errors?: CrowdaaError[];
};

type TriggerComputeActiveUsersEventBridgeEvent = EventBridgeEvent<
  'Scheduled Event',
  {}
>;

type TriggerComputeActiveUsersLambdaEvent =
  | APIGatewayProxyEvent
  | TriggerComputeActiveUsersEventBridgeEvent;

function isAPIGatewayProxyEvent(
  event: TriggerComputeActiveUsersLambdaEvent
): event is APIGatewayProxyEvent {
  return (event as APIGatewayProxyEvent).httpMethod !== undefined;
}

let client: any; // TODO type
let db: any; // TODO type

export default async (event: TriggerComputeActiveUsersLambdaEvent) => {
  if (!client) client = await MongoClient.connect();
  if (!db) db = client.db();
  // TODO validation if parameters are provided

  // This Lambda is supposed to be called to compute the number of active users for the previous day.
  const todayDate = new Date();
  const yesterdayDate = new Date(
    Date.UTC(
      todayDate.getUTCFullYear(),
      todayDate.getUTCMonth(),
      todayDate.getUTCDate() - 1
    )
  );

  try {
    // This code is not executed
    trowExceptionUntestedCode20240808();

    if (isAPIGatewayProxyEvent(event)) {
      // considering http called
      const { principalId: userId } =
        (event.requestContext || {}).authorizer || {};
      const user: UserType = await db
        .collection(COLL_USERS)
        .findOne({ _id: userId });

      if (!user || !isUserSuperAdmin(user)) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          NOT_ENOUGH_PERMISSIONS_CODE,
          'Insufficient permissions'
        );
      }
    }
    // else considering triggered

    const crowdaaErrors = await triggerComputeActiveUsers({
      day: yesterdayDate,
      db,
    });
    let body: ResponseBody;
    if (crowdaaErrors.length > 0) {
      body = {
        status: 'error',
        errors: crowdaaErrors,
      };
    } else {
      body = { status: 'done' };
    }

    return response({
      code: 200,
      body,
    });
  } catch (err) {
    handleException(err);
  } finally {
    await client.close();
  }
};
