/* eslint-disable import/no-relative-packages */
import { setOrgDebugPaidChecks } from '../lib/fieldsChecks';
import setOrgPaid from '../lib/setOrgPaid';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
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

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(setOrgDebugPaidChecks).forEach((field) => {
      const cb = setOrgDebugPaidChecks[field];

      if (!cb(bodyParsed[field], bodyParsed)) {
        throw new Error('mal_formed_request');
      }
    });

    const org = await setOrgPaid(userId, bodyParsed);
    return response({ code: 200, body: org });
  } catch (exception) {
    return handleException(exception);
  }
};
