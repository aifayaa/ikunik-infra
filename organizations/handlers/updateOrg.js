/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-relative-packages */
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import updateOrg from '../lib/updateOrg';
import { updateOrgSchema } from '../validators/updateOrg.schema';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) throw new Error('access_forbidden');

    const update = JSON.parse(event.body);

    // validation
    try {
      updateOrgSchema.parse(update);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    const modifiedCount = await updateOrg(orgId, update);

    return response({ code: 200, body: { count: modifiedCount } });
  } catch (error) {
    return response(errorMessage({ message: error.message, error }));
  }
};
