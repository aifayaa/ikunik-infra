/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-relative-packages */
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import updateOrg from '../lib/updateOrg';
import { UpdateOrgSchema } from '../validators/updateOrg.schema';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) throw new Error('access_forbidden');

    const update = JSON.parse(event.body);

    // validation
    UpdateOrgSchema.parse(update);

    const modifiedCount = await updateOrg(orgId, update);

    return response({ code: 200, body: { count: modifiedCount } });
  } catch (error) {
    return response(errorMessage({ message: error.message, error }));
  }
};
