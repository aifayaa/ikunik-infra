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
import { CrowdaaErrorWithErrorBody } from '../../libs/httpResponses/CrowdaaErrorWithErrorBody';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  isApplicationInOrganization,
  isAppAlreadyBuild,
  getApp,
} from '../../apps/lib/appsUtils.ts';

export async function putAppInOrgHandlerBody(userId, orgId, appId) {
  const orgPermissionLevel = 'admin';
  await checkPermsForOrganization(userId, orgId, [orgPermissionLevel]);

  await checkPermsForApp(userId, appId, ['owner']);

  const application = await getApp(appId);
  const appInOrganization = isApplicationInOrganization(application);

  if (!appInOrganization) {
    const org = await putAppInOrg(userId, orgId, appId, 'fromUserToOrg');
    return org;
  } else {
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

    await checkPermsForOrganization(
      userId,
      applicationOrganizationId,
      orgPermissionLevel
    );

    const org = await putAppInOrg(userId, orgId, appId, 'fromOrgToOrg');
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
