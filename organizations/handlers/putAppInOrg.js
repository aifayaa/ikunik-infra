/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor.ts';

import putAppInOrg from '../lib/putAppInOrg';
import {
  APP_ALREADY_BUILD_CODE,
  ERROR_TYPE_INTERNAL_EXCEPTION,
} from '../../libs/httpResponses/errorCodes.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  isApplicationInOrganization,
  isAppAlreadyBuild,
  getApp,
} from '../../apps/lib/appsUtils.ts';
import { getOrganization } from '../lib/organizationsUtils.ts';
import getOrgApps from '../lib/getOrgApps';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export async function putAppInOrgHandlerBody(userId, orgId, appId) {
  const orgPermissionLevel = ['admin'];
  await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

  await checkPermsForApp(userId, appId, ['owner']);

  const application = await getApp(appId);
  const appInOrganization = isApplicationInOrganization(application);

  if (!appInOrganization) {
    const org = await putAppInOrg(userId, orgId, appId, 'fromUserToOrg');
    return org;
  } else {
    const sourceOrgId = application.organization._id;
    const sourceOrg = await getOrganization(sourceOrgId);
    const destinationOrg = await getOrganization(orgId);

    const sourceTeamId = sourceOrg.apple.teamId;
    const destinationTeamId = destinationOrg.apple.teamId;

    if (isAppAlreadyBuild(application)) {
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

    const applicationOrganizationId =
      application && application.organization && application.organization._id;

    await checkPermsForOrganization(
      userId,
      applicationOrganizationId,
      orgPermissionLevel
    );

    // TODO: use a transaction
    const org = await putAppInOrg(userId, orgId, appId, 'fromOrgToOrg');

    // After the transfer of the application between organisation
    // If the source organisation doesn't have build applications anymore,
    // -> Unlock its teamId
    // -> If the source organization has a locked teamId
    //    -> Lock the teamId of the destination organisation
    if (sourceOrg.apple.setupDone) {
      const appsAlreadyBuildStatus = (await getOrgApps(sourceOrgId)).map(
        isAppAlreadyBuild
      );

      const hasAtLeastOneBuiltApplication =
        appsAlreadyBuildStatus.some(Boolean);

      const client = await MongoClient.connect();
      if (!hasAtLeastOneBuiltApplication) {
        await client
          .db()
          .collection(COLL_ORGANIZATIONS)
          .updateOne(
            { _id: sourceOrgId },
            {
              $set: { 'apple.setupDone': false },
            }
          );
      }

      // In any case, locks the destination organization teamId
      await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .updateOne(
          { _id: orgId },
          {
            $set: { 'apple.setupDone': true, 'apple.teamStatus': 'valid' },
          }
        );
    }

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

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = putAppInOrgSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { appId } = validatedBody;

    const org = await putAppInOrgHandlerBody(userId, orgId, appId);

    return response({ code: 200, body: formatResponseBody({ data: org }) });
  } catch (exception) {
    return handleException(exception);
  }
};
