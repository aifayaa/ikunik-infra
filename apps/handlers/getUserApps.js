/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getUserApps from '../lib/getUserApps';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  try {
    if (!userId) throw new Error('no_user_found');

    const appsList = await getUserApps(userId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: { items: appsList, totalCount: appsList.length },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
