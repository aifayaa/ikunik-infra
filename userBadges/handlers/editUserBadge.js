import editUserBadge from '../lib/editUserBadge';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { optionnalUrlRegexp } from '../../libs/regexp/url';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
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
    const {
      name,
      validationUrl = '',
    } = bodyParsed;

    if (!name) {
      throw new Error('mal_formed_request');
    }

    if (typeof name !== 'string') {
      throw new Error('wrong_argument_type');
    }
    if (!optionnalUrlRegexp.test(validationUrl)) {
      throw new Error('invalid_badge_validation_url');
    }

    const userBadge = await editUserBadge(userBadgeId, appId, bodyParsed);
    return response({ code: 200, body: { userBadge } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
