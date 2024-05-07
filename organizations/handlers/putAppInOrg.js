/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor';

import putAppInOrg from '../lib/putAppInOrg';
import {
  APPLICATION_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
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
    if (!allowedApp) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: APPLICATION_PERMISSION_CODE,
            message: `User '${userId}' is not at least '${appPermissionLevel}' on application ${appId}`,
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

    const org = await putAppInOrg(userId, orgId, appId);
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
