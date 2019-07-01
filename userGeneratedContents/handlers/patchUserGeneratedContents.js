import patchUserGeneratedContents from '../lib/patchUserGeneratedContents';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const {
      data,
    } = bodyParsed;

    if (!data) {
      throw new Error('Missing arguments');
    }

    [
      data,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await patchUserGeneratedContents(
      userId,
      appId,
      userGeneratedContentsId,
      data,
    );

    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
