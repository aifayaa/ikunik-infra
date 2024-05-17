/* eslint-disable import/no-relative-packages */
import listCollections from '../lib/listCollections';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await listCollections(appId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
