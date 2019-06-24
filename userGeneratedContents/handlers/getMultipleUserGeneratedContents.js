import getMultipleUserGeneratedContents from '../lib/getMultipleUserGeneratedContents';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const parentId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  const pathSplitted = event.resource.split('/');
  const parentCollection = pathSplitted[1];
  try {
    if (!parentId || !parentCollection) {
      throw new Error('Missing arguments');
    }

    [
      parentId,
      parentCollection,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await getMultipleUserGeneratedContents(appId, parentId, parentCollection);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
