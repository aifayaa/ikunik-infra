/* eslint-disable import/no-relative-packages */
import pushAppToOrg from '../lib/putAppInOrg';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import { putAppFieldChecks } from '../lib/fieldsChecks';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const orgId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(putAppFieldChecks).forEach((field) => {
      const cb = putAppFieldChecks[field];

      if (!cb(bodyParsed[field], bodyParsed)) {
        throw new Error('mal_formed_request');
      }
    });

    const org = await pushAppToOrg(orgId, bodyParsed);
    return response({ code: 200, body: org });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
