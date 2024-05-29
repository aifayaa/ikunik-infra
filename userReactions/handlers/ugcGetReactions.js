/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import ugcGetReactions from '../lib/ugcGetReactions';

export default async (event) => {
  const ugcId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { types: reactionsToReturn } = event.queryStringParameters || {};

  try {
    const reactions = await ugcGetReactions(
      appId,
      ugcId,
      userId,
      reactionsToReturn ? reactionsToReturn.split(',') : []
    );
    return response({ code: 200, body: reactions });
  } catch (e) {
    return response(errorMessage(e));
  }
};
