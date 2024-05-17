/* eslint-disable import/no-relative-packages */
import attachCollectionToBadge from '../lib/attachCollectionToBadge';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const collectionId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const { badgeId } = JSON.parse(event.body);

    const results = await attachCollectionToBadge(appId, collectionId, badgeId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
