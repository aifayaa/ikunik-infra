/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import changeUserOrgPerms from '../lib/changeUserOrgPerms';
import {
  ERROR_TYPE_ACCESS,
  ORGANIZATION_PERMISSION_CODE,
} from '../../libs/httpResponses/errorCodes';

export const changeUserOrgPermsSchema = z
  .object({
    roles: z.array(z.enum(['owner', 'admin', 'member'])).nonempty(),
  })
  .required();

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetUserId } = event.pathParameters;

  try {
    /* TODO On a le droit d'avoir plusieurs owners.
     * On peut nommer un owner si on en est un.
     * On peut supprimer un owner (y compris soi même) si il en reste d'autres.
     * Il faudra une méthode `getPermsFor` qui retourne les rôles pour plus de flexibilité à ce niveau.
     */
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

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = changeUserOrgPermsSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { roles } = validatedBody;
    const user = await changeUserOrgPerms(targetUserId, orgId, roles);

    return response({ code: 200, body: formatResponseBody({ data: user }) });
  } catch (exception) {
    return handleException(exception);
  }
};
