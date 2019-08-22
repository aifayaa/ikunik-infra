import getUserGeneratedContents from '../lib/getUserGeneratedContents';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const userGeneratedContentsId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;

  try {
    const results = await getUserGeneratedContents(
      appId,
      userGeneratedContentsId,
    );
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
