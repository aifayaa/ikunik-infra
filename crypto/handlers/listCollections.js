/* eslint-disable import/no-relative-packages */
import listCollections from '../lib/listCollections';
import getPerms from '../../libs/perms/getPerms';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';

/** @TODO fix permissions globally, do something, please... */
const permKey = 'apps_getInfos';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  try {
    const perms = await getPerms(userId, appId);

    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const results = await listCollections(appId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
