import addUserPermission from '../lib/addUserPermission';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
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
    } = bodyParsed;

    if (!name) {
      throw new Error('mal_formed_request');
    }

    if (typeof name !== 'string') {
      throw new Error('wrong_argument_type');
    }

    const userPermission = await addUserPermission(userId, appId, bodyParsed);
    return response({ code: 200, body: { userPermission } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
