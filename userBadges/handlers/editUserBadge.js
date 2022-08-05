import editUserBadge from '../lib/editUserBadge';
import fieldChecks from '../lib/badgeFieldsChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(fieldChecks).forEach((field) => {
      const cb = fieldChecks[field];

      if (!cb(bodyParsed[field])) throw new Error('mal_formed_request');
    });

    const userBadge = await editUserBadge(userBadgeId, appId, bodyParsed, { userId });
    return response({ code: 200, body: { userBadge } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
