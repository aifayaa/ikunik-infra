/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getAppUsers from '../lib/getAppUsers';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;

  try {
    // TODO: check if userId has access to appId before anything else

    const users = await getAppUsers(appId);

    return response({ code: 200, body: users });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
