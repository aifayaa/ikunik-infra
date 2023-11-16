import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import ugcReact from '../lib/ugcReact';

export default async (event) => {
  const { id: ugcId, reaction } = event.pathParameters;
  const {
    appId,
    principalId: userId,
  } = event.requestContext.authorizer;

  try {
    const ok = await ugcReact(appId, ugcId, userId, reaction);
    return response({ code: 200, body: ok });
  } catch (e) {
    return response(errorMessage(e));
  }
};
