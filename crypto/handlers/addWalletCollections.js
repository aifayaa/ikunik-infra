/* eslint-disable import/no-relative-packages */
import addWalletCollections from '../lib/addWalletCollections';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const { wallet } = JSON.parse(event.body);

    const results = await addWalletCollections(appId, wallet);

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
