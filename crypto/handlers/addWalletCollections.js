import addWalletCollections from '../lib/addWalletCollections';
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

    const {
      wallet,
    } = JSON.parse(event.body);

    const results = await addWalletCollections(appId, wallet);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
