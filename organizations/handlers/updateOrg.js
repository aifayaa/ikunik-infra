/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import updateOrg from '../lib/updateOrg';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const orgPermissionLevel = 'admin';
    const allowed = await checkPermsForOrganization(
      userId,
      orgId,
      orgPermissionLevel
    );
    if (!allowed) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_ACCESS,
            code: ORGANIZATION_PERMISSION_CODE,
            message: `User '${userId}' is not at least '${orgPermissionLevel}' on organization '${orgId}'`,
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

    const body = JSON.parse(event.body);

    const updateOrgSchema = z.object({
      name: z
        .string({
          required_error: 'name is required',
          invalid_type_error: 'name must be a string',
        })
        .max(80, { message: 'Must be 80 or fewer characters long' })
        .trim()
        .optional(),
      email: z
        .string({
          required_error: 'email is required',
        })
        .email()
        .trim()
        .optional(),
      appleTeamId: z
        .string({
          invalid_type_error: 'appleTeamId must be a string',
        })
        .length(10, { message: 'Must be 10 characters long' })
        .trim()
        .optional(),
      appleCompanyName: z
        .string({
          invalid_type_error: 'appleCompanyName must be a string',
        })
        .min(1, { message: 'Must be at least 1 character long' })
        .max(100, { message: 'Must be at most 100 character long' }) // Arbitrary length
        .trim()
        .optional(),
    });

    // validation
    let validatedBody;
    try {
      validatedBody = updateOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { name, email, appleTeamId, appleCompanyName } = validatedBody;
    const org = await updateOrg(
      orgId,
      name,
      email,
      appleTeamId,
      appleCompanyName
    );

    return response({
      code: 200,
      body: formatResponseBody({ data: org }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
