/* eslint-disable import/no-relative-packages */
import deleteAccount from '../lib/deleteAccount';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const deleteResponse = await deleteAccount(appId, userId);
    return response({ code: 200, body: deleteResponse });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
