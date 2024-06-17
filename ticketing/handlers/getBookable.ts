/* eslint-disable import/no-relative-packages */
import updateBookable from '../lib/updateBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getBookable from '../lib/getBookable';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const bookableId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newBookable = await getBookable(bookableId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: newBookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
