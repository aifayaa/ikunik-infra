/* eslint-disable import/no-relative-packages */
import getOrgInvitations from '../lib/getOrgInvitations';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { paginationSchema } from '../../libs/schemas/pagination.schema';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import {
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ORGANIZATION_PERMISSION_CODE,
  UNMANAGED_EXCEPTION_CODE,
} from '../../libs/httpResponses/errorCodes';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;
  let { queryStringParameters } = event;

  try {
    try {
      queryStringParameters = paginationSchema.parse(queryStringParameters);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

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

    const result = await getOrgInvitations(orgId, queryStringParameters);
    return response({
      code: 200,
      body: formatResponseBody({ data: result }),
    });
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
