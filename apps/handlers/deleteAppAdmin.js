/* eslint-disable import/no-relative-packages */
import deleteAppAdmin from '../lib/deleteAppAdmin';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const { adminId } = JSON.parse(event.body);

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
