/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors.ts';
import { getInvitations } from '../lib/getInvitations';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { paginationSchema } from '../../libs/schemas/pagination.schema';
import { filterSensitiveProperties } from '../utils/filterSensitiveProperties';

export default async (event) => {
  const { principalId: currentUserId } = event.requestContext.authorizer;
  let { queryStringParameters } = event;

  try {
    try {
      queryStringParameters = paginationSchema.parse(queryStringParameters);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    // access to the invitations is determined in a step further
    const invitationDocumentsResult = await getInvitations(currentUserId, {
      getAllOptions: queryStringParameters,
    });

    invitationDocumentsResult.items = invitationDocumentsResult.items.map(
      (invitationDocument) => filterSensitiveProperties(invitationDocument)
    );

    return response({
      code: 200,
      body: formatResponseBody({ data: invitationDocumentsResult }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
