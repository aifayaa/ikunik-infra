/* eslint-disable import/no-relative-packages */
import delOrgApp from '../lib/delOrgApp';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, appId } = event.pathParameters;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const org = await delOrgApp(orgId, appId);
    return response({ code: 200, body: org });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
