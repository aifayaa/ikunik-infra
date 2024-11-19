/* eslint-disable import/no-relative-packages */
import getMalls from '../lib/getMalls';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;

  try {
    const body = await getMalls(appId);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
