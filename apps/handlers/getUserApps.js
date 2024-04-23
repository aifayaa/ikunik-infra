/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getUserApps from '../lib/getUserApps';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  try {
    if (!userId) throw new Error('no_user_found');

    const res = await getUserApps(userId);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
