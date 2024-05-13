/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import getUserOrgs from '../lib/getUserOrgs';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  CONTEXT_AUTHORIZER_NO_USER_CODE,
  ERROR_TYPE_AUTHORIZATION,
} from '../../libs/httpResponses/errorCodes';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_AUTHORIZATION,
            code: CONTEXT_AUTHORIZER_NO_USER_CODE,
            message: `Cannot find user in request context`,
            details: { requestContext: event.requestContext },
          },
        ],
      });

      return response({ code: 200, body: errorBody });
    }

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
