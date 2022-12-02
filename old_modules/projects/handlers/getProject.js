import getProject from '../lib/getProject';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const projectId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    if (!projectId) throw new Error('Missing id');
    const results = await getProject(projectId, userId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    const code = (e.message === 'Not found') ? 404 : 500;
    return response({ code, message: e.message });
  }
};
