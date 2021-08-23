import deleteAppAdmin from '../lib/deleteAppAdmin';
import getPerms from '../../libs/perms/getPerms';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';

/** @TODO fix permissions globally, do something, please... */
const permKey = 'apps_getInfos';

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  try {
    const perms = await getPerms(userId, appId);

    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const {
      adminId,
    } = JSON.parse(event.body);

    if (!adminId || typeof adminId !== 'string') {
      throw new Error('wrong_argument_type');
    }

    if (adminId === userId) {
      throw new Error('cannot_delete_self');
    }

    const results = await deleteAppAdmin(appId, adminId);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
