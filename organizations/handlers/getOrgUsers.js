/* eslint-disable import/no-relative-packages */
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import getUserOrgPerms from '../lib/getUserOrgPerms';
import {
  addUserOrganisationRoles,
  filterUserPrivateFields,
} from '../../users/lib/usersUtils.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId } = event.pathParameters;

  try {
    const orgPermissionLevel = ['member'];
    await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

    const users = await getUserOrgPerms(orgId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: users.map((user) =>
            filterUserPrivateFields(addUserOrganisationRoles(user, orgId))
          ),
          totalCount: users.length,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
