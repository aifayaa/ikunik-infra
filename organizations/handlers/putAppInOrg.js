/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
  // getApplicationOrganizationId,
  getApplicationWithOrg,
} from '../../libs/perms/checkPermsFor';

import putAppInOrg from '../lib/putAppInOrg';
import {
  // APPLICATION_PERMISSION_CODE,
  APP_ALREADY_BUILD_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
  ORGANIZATION_NOT_FOUND_CODE,
  ORGANIZATION_PERMISSION_CODE,
  UNMANAGED_EXCEPTION_CODE,
} from '../../libs/httpResponses/errorCodes';

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
    const orgPermissionLevel = 'admin';
    const allowedOrg = await checkPermsForOrganization(
      userId,
      orgId,
      orgPermissionLevel
    );
    if (!allowedOrg) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${userId}' is not at least '${orgPermissionLevel}' on organization ${orgId}`,
            details: {
              userId,
              orgId,
              orgPermissionLevel,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    if (!event.body) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_VALIDATION_ERROR,
            code: MISSING_BODY_CODE,
            message: `The body of the request is missing`,
            details: {
              body: event.body,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = putAppInOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { appId } = validatedBody;

    const appPermissionLevel = 'owner';
    const allowedApp = checkPermsForApp(userId, appId, appPermissionLevel);

    if (allowedApp) {
      const org = await putAppInOrg(userId, orgId, appId, 'fromUserToOrg');
      return response({ code: 200, body: formatResponseBody({ data: org }) });
    }

    const application = await getApplicationWithOrg(appId);
    if (application.builds || application.setup) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_INTERNAL_EXCEPTION,
            code: APP_ALREADY_BUILD_CODE,
            message: `Application '${appId}' cannot be moved between organizations because already built`,
            details: {
              userId,
              appId,
              appPermissionLevel,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const applicationOrganizationId =
      application && application.organization && application.organization._id;

    if (!applicationOrganizationId) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_NOT_FOUND,
            code: ORGANIZATION_NOT_FOUND_CODE,
            message: `Cannot found the organization of application '${appId}'`,
            details: {
              userId,
              appId,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const allowedOriginOrganization = await checkPermsForOrganization(
      userId,
      applicationOrganizationId,
      orgPermissionLevel
    );

    if (!allowedOriginOrganization) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${userId}' is not at least '${orgPermissionLevel}' on organization ${applicationOrganizationId} which contains the application '${appId}'`,
            details: {
              userId,
              applicationOrganizationId,
              orgPermissionLevel,
              appId,
            },
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const org = await putAppInOrg(userId, orgId, appId, 'fromOrgToOrg');
    return response({ code: 200, body: formatResponseBody({ data: org }) });
  } catch (exception) {
    const errorBody = formatResponseBody({
      errors: [
        {
          type: ERROR_TYPE_INTERNAL_EXCEPTION,
          code: UNMANAGED_EXCEPTION_CODE,
          message: exception.message,
          details: exception,
        },
      ],
    });
    return response({ code: 200, body: errorBody });
  }
};
