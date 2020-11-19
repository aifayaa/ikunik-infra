import response from '../../libs/httpResponses/response';
import deleteFiles from '../lib/deleteFiles';
// import { checkPerms } from '../../libs/perms/checkPerms';
// const permKey = 'files_delete';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  /* Check upload permissions */
  // TODO: better rights management, Delete File is allowed for all logged users
  // const perms = JSON.parse(event.requestContext.authorizer.perms);
  // if (!checkPerms(permKey, perms)) {
  //   return response({ code: 403, message: 'access_forbidden' });
  // }

  try {
    if (!userId) {
      throw new Error('missing_user_id');
    }

    const { files } = JSON.parse(event.body);

    if (typeof files !== 'object' || !files.length) {
      throw new Error('wrong_argument');
    }

    files.forEach((v) => {
      const { name, type, size, id } = v;
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
    });

    const info = await deleteFiles(files);
    return response({ code: 200, body: info });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
