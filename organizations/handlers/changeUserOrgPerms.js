/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import changeUserOrgPerms from '../lib/changeUserOrgPerms';
import { changeUserOrgPermsSchema } from '../validators/changeUserOrgPerms.schema';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, userId: targetUserId } = event.pathParameters;

  try {
    /* TODO On a le droit d'avoir plusieurs owners.
     * On peut nommer un owner si on en est un.
     * On peut supprimer un owner (y compris soi même) si il en reste d'autres.
     * Il faudra une méthode `getPermsFor` qui retourne les rôles pour plus de flexibilité à ce niveau.
     */
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
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

    const user = await changeUserOrgPerms(targetUserId, orgId, validatedBody);

    return response({ code: 200, body: user });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
