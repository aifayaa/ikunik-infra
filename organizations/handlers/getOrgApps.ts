/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';

import getOrgApps from '../lib/getOrgApps';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { OrganizationPermType } from '../../libs/perms/permEntities';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: orgId } = event.pathParameters as {
    id: string;
  };

  try {
    const orgPermissionLevel: OrganizationPermType[] = ['member'];
    await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

    const apps = await getOrgApps(orgId, userId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: { items: apps, totalCount: apps.length },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
