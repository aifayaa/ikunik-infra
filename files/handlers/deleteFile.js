/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import deleteFile from '../lib/deleteFile';
import findFileOfUser from '../lib/findFileOfUser';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

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
    const fileOfUser = await findFileOfUser(userId, appId, file);
    await checkPermsForApp(userId, appId, ['admin']);

    if (!fileOfUser) {
      throw new Error('wrong_argument');
    }

    const info = await deleteFile(userId, appId, file);
    return response({ code: 200, body: info });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
