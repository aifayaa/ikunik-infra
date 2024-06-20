/* eslint-disable import/no-relative-packages */
import updateBookable from '../lib/updateBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import deleteBookable from '../lib/deleteBookable';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const bookableId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deletedBookable = await deleteBookable(bookableId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: deletedBookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
