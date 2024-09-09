/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor';

import { putAppInOrgOrgToOrg, putAppInOrgUserToOrg } from '../lib/putAppInOrg';
import {
  APP_ALREADY_BUILD_CODE,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  isApplicationInOrganization,
  isAppAlreadyBuild,
  getApp,
  assertApplicationInOrganization,
  appPrivateFieldsProjection,
} from '../../apps/lib/appsUtils';
import { getOrganization } from '../lib/organizationsUtils';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { OrganizationPermType } from '../../libs/perms/permEntities';
import { APIGatewayProxyEvent } from 'aws-lambda';

const { COLL_ORGANIZATIONS, COLL_APPS } = mongoCollections;

export async function putAppInOrgHandlerBody(
  userId: string,
  orgId: string,
  appId: string
) {
  const orgPermissionLevel = ['admin'] as OrganizationPermType[];
  await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

  await checkPermsForApp(userId, appId, ['owner']);

  const application = await getApp(appId);
  const isAppInOrg = isApplicationInOrganization(application);

  if (!isAppInOrg) {
    const org = await putAppInOrgUserToOrg(userId, orgId, appId);
    return org;
  } else {
    const appInOrg = assertApplicationInOrganization(application);

    const sourceOrgId = appInOrg.organization._id;
    const sourceOrg = await getOrganization(sourceOrgId);
    const destinationOrg = await getOrganization(orgId);

    const sourceTeamId = sourceOrg.apple.teamId;
    const destinationTeamId = destinationOrg.apple.teamId;

    if (isAppAlreadyBuild(appInOrg)) {
      if (sourceTeamId && sourceTeamId !== destinationTeamId) {
        throw new CrowdaaError(
          ERROR_TYPE_INTERNAL_EXCEPTION,
          APP_ALREADY_BUILD_CODE,
          `Application '${appId}' cannot be moved from source organization '${sourceOrgId}' to destination organization '${orgId}' because the teamId don't match: (source teamId) '${sourceTeamId}' != '${destinationTeamId}' (destination teamId)`,
          {
            details: {
              userId,
              appId,
            },
          }
        );
      }
    }

    const applicationOrganizationId = appInOrg.organization._id;

    await checkPermsForOrganization(
      userId,
      applicationOrganizationId,
      orgPermissionLevel
    );

    let org;
    const client = await MongoClient.connect();
    const db = client.db();
    // Documentation, how to use transaction:
    // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
    await client
      .withSession(
        async (sessionArg: {
          withTransaction: (session: unknown) => Promise<void>;
        }) => {
          await sessionArg.withTransaction(async (session: unknown) => {
            org = await putAppInOrgOrgToOrg(userId, orgId, appId, db, session);

            // After the transfer of the application between organisation
            // If the source organisation doesn't have build applications anymore,
            // -> Unlock its teamId
            // -> If the source organization has a locked teamId
            //    -> Lock the teamId of the destination organisation
            if (sourceOrg.apple.setupDone) {
              const appsAlreadyBuildStatus = (
                await db
                  .collection(COLL_APPS)
                  .find(
                    { 'organization._id': sourceOrgId },
                    {
                      projection: appPrivateFieldsProjection,
                      session,
                    }
                  )
                  .toArray()
              ).map(isAppAlreadyBuild);

              const hasAtLeastOneBuiltApplication =
                appsAlreadyBuildStatus.some(Boolean);

              if (!hasAtLeastOneBuiltApplication) {
                await db.collection(COLL_ORGANIZATIONS).updateOne(
                  { _id: sourceOrgId },
                  {
                    $set: { 'apple.setupDone': false },
                  },
                  { session }
                );
              }

              // Locks the destination organization teamId
              await db.collection(COLL_ORGANIZATIONS).updateOne(
                { _id: orgId },
                {
                  $set: {
                    'apple.setupDone': true,
                    'apple.teamStatus': 'valid',
                  },
                },
                { session }
              );
            }
          });
        }
      )
      .finally(() => {
        client.close();
      });

    return org;
  }
}

const putAppInOrgSchema = z
  .object({
    appId: z
      .string({
        required_error: 'appId is required',
        invalid_type_error: 'appId must be a string',
      })
      .max(80, { message: 'Must be 80 or fewer characters long' })
      .trim(),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: orgId } = event.pathParameters as {
    id: string;
  };

  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const body = JSON.parse(event.body);

    // validation
    const validatedBody = putAppInOrgSchema.parse(body);

    const { appId } = validatedBody;

    const org = await putAppInOrgHandlerBody(userId, orgId, appId);

    return response({ code: 200, body: formatResponseBody({ data: org }) });
  } catch (exception) {
    return handleException(exception);
  }
};
