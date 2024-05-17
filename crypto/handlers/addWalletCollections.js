/* eslint-disable import/no-relative-packages */
import addWalletCollections from '../lib/addWalletCollections';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const { wallet } = JSON.parse(event.body);

    const results = await addWalletCollections(appId, wallet);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
