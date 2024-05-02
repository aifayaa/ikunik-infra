/* eslint-disable import/no-relative-packages */
import delOrgApp from '../lib/delOrgApp';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { delOrgAppSchema } from '../validators/delOrgApp.schema';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, appId } = event.pathParameters;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = delOrgAppSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { newOwner } = validatedBody;

    const org = await delOrgApp(orgId, appId, newOwner);
    return response({ code: 200, body: org });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
