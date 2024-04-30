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

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = updateOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const modifiedCount = await updateOrg(orgId, validatedBody);

    return response({ code: 200, body: { count: modifiedCount } });
  } catch (error) {
    return response(errorMessage({ message: error.message, error }));
  }
};
