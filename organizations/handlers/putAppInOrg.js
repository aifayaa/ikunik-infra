/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
  getApplicationWithinOrg,
} from '../../libs/perms/checkPermsFor';

import putAppInOrg from '../lib/putAppInOrg';
import {
  APP_ALREADY_BUILD_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  ORGANIZATION_NOT_FOUND_CODE,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';
import { CrowdaaErrorWithErrorBody } from '../../libs/httpResponses/CrowdaaErrorWithErrorBody';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import { isAppAlreadyBuild } from '../lib/organizationsUtils';

export async function putAppInOrgHandlerBody(userId, orgId, appId) {
  const orgPermissionLevel = 'admin';
  const allowedOrg = await checkPermsForOrganization(
    userId,
    orgId,
    orgPermissionLevel
  );
  if (!allowedOrg) {
    throw new CrowdaaError(
      ERROR_TYPE_ACCESS,
      ORGANIZATION_PERMISSION_CODE,
      `User '${userId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
      {
        details: {
          userId,
          orgId,
          orgPermissionLevel,
        },
      }
    );
  }

  const allowedApp = await checkPermsForApp(userId, appId, ['owner'], {
    dontThrow: true,
  });

  if (allowedApp) {
    const org = await putAppInOrg(userId, orgId, appId, 'fromUserToOrg');
    return org;
  }

  const application = await getApplicationWithinOrg(appId);
  if (isAppAlreadyBuild(application)) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      APP_ALREADY_BUILD_CODE,
      `Application '${appId}' cannot be moved between organizations because already built`,
      {
        details: {
          userId,
          appId,
        },
      }
    );
  }

  const applicationOrganizationId =
    application && application.organization && application.organization._id;

  if (!applicationOrganizationId) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      ORGANIZATION_NOT_FOUND_CODE,
      `Cannot found the organization of application '${appId}'`,
      {
        details: {
          userId,
          appId,
        },
      }
    );
  }

  const allowedOriginOrganization = await checkPermsForOrganization(
    userId,
    applicationOrganizationId,
    orgPermissionLevel
  );

  if (!allowedOriginOrganization) {
    throw new CrowdaaError(
      ERROR_TYPE_ACCESS,
      ORGANIZATION_PERMISSION_CODE,
      `User '${userId}' is not at least '${orgPermissionLevel}' on organization '${applicationOrganizationId}' which contains the application '${appId}'`,
      {
        details: {
          userId,
          applicationOrganizationId,
          orgPermissionLevel,
          appId,
        },
      }
    );
  }

  const org = await putAppInOrg(userId, orgId, appId, 'fromOrgToOrg');
  return org;
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
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      throw new CrowdaaErrorWithErrorBody(errorBody);
    }

    const { appId } = validatedBody;

    const org = await putAppInOrgHandlerBody(userId, orgId, appId);

    return response({ code: 200, body: formatResponseBody({ data: org }) });
  } catch (exception) {
    return handleException(exception);
  }
};
