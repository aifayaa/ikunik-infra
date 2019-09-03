import getUserGeneratedContents from '../lib/getUserGeneratedContents';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userGeneratedContentsId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;

  try {
    const results = await getUserGeneratedContents(
      appId,
      userGeneratedContentsId,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
