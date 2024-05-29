/* eslint-disable import/no-relative-packages */
import deleteAppAdmin from '../lib/deleteAppAdmin';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

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
  } catch (exception) {
    return handleException(exception);
  }
};
