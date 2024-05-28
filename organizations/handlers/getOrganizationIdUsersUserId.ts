/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  addUserOrganisationRoles,
  filterUserPrivateFields,
  getUser,
} from '../../users/lib/usersUtils';
import { OrganizationPermType } from '../../libs/perms/permEntities';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: sourceUserId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: orgId, userId: targetUserId } = event.pathParameters as {
    id: string;
    userId: string;
  };

  try {
    const user = await getUser(targetUserId);

    const orgPermissionLevel: OrganizationPermType[] = ['member'];
    await checkPermsForOrganization(sourceUserId, orgId, orgPermissionLevel);
    await checkPermsForOrganization(targetUserId, orgId, orgPermissionLevel);

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterUserPrivateFields(addUserOrganisationRoles(user, orgId)),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
