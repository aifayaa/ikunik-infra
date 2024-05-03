/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  checkPermsForApp,
  checkPermsForOrganization,
} from '../../libs/perms/checkPermsFor';
import { putAppInOrgSchema } from '../validators/putAppInOrg.schema';
import putAppInOrg from '../lib/putAppInOrg';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    // TODO Limiter les droits aux admins, pas members
    const allowedOrg = await checkPermsForOrganization(userId, orgId, 'member');
    if (!allowedOrg) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = putAppInOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { appId } = validatedBody;

    const allowedApp = checkPermsForApp(userId, appId, 'owner');
    if (!allowedApp) {
      throw new Error('access_forbidden');
    }

    const org = await putAppInOrg(userId, orgId, appId);
    return response({ code: 200, body: org });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
