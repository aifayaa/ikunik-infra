/* eslint-disable import/no-relative-packages */
import deleteAccount from '../lib/deleteAccount';
import { handleException } from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    return await deleteAccount(appId, userId);
  } catch (exception) {
    return handleException(exception);
  }
};
