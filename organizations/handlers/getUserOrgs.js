/* eslint-disable import/no-relative-packages */
import { returnedFieldsFilter } from '../lib/fieldsChecks';
import response from '../../libs/httpResponses/response';
import getUserOrgs from '../lib/getUserOrgs';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import {
  CONTEXT_AUTHORIZER_NO_USER,
  ERROR_TYPE_AUTHORIZATION,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_AUTHORIZATION,
            code: CONTEXT_AUTHORIZER_NO_USER,
            message: `Cannot find user in request context`,
            details: { requestContext: event.requestContext },
          },
        ],
      });

      return response({ code: 200, body: errorBody });
    }

    const orgs = await getUserOrgs(userId);

    const responseBody = formatResponseBody({
      data: { organizations: orgs.map(returnedFieldsFilter) },
    });

    return response({
      code: 200,
      body: responseBody,
    });
  } catch (exception) {
    const errorBody = formatResponseBody({
      errors: [
        {
          type: ERROR_TYPE_INTERNAL_EXCEPTION,
          code: UNMANAGED_EXCEPTION,
          message: exception.message,
          details: exception,
        },
      ],
    });
    return response({ code: 200, body: errorBody });
  }
};
