/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import getUserOrgs from '../lib/getUserOrgs';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    const orgs = await getUserOrgs(userId);

    const responseBody = formatResponseBody({
      data: { items: orgs, totalCount: orgs.length },
    });

    return response({
      code: 200,
      body: responseBody,
    });
  } catch (exception) {
    return handleException(exception);
  }
};
