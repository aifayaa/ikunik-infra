import deleteUser from '../lib/deleteUser';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    if (userId !== urlId) {
      return response({ code: 403, message: 'Forbidden' });
    }

    const deleteRefs = await deleteUser(userId, appId);
    return response({ code: 200, body: deleteRefs });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
