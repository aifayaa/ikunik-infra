import response from '../../libs/httpResponses/response';
import deleteFile from '../lib/deleteFile';
import findFileOfUser from '../lib/findFileOfUser';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = ['files_delete', 'files_all'];

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      throw new Error('missing_user_id');
    }

    const { file } = JSON.parse(event.body);

    if (typeof file !== 'object' || !file) {
      throw new Error('wrong_argument');
    }

    const { name, type, size, id } = file;
    if (
      typeof name !== 'string' ||
      typeof type !== 'string' ||
      typeof id !== 'string' ||
      typeof size !== 'number'
    ) {
      throw new Error('wrong_argument_type');
    }
    if (!name || !type || !size || !id) {
      throw new Error('wrong_argument');
    }

    /* Check delete permissions */
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const fileOfUser = await findFileOfUser(userId, appId, file);
    const hasPerms = checkPerms(permKeys, perms);
    if (!hasPerms) {
      if (!fileOfUser) {
        throw new Error('wrong_argument');
      }
      return response({ code: 403, message: 'access_forbidden' });
    }

    const info = await deleteFile(userId, appId, file);
    return response({ code: 200, body: info });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
