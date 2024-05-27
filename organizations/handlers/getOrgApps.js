/* eslint-disable import/no-relative-packages */
import getOrgApps from '../lib/getOrgApps';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const orgPermissionLevel = 'member';
    await checkPermsForOrganization(userId, orgId, orgPermissionLevel);

    const apps = await getOrgApps(orgId);

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
