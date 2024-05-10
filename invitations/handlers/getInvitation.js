/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { getInvitation } from '../lib/getInvitation';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { makeIdSchema } from '../../libs/schemas/makeIdSchema';
import { filterSensitiveProperties } from '../utils/filterSensitiveProperties';

export default async (event) => {
  const { principalId: currentUserId } = event.requestContext.authorizer;
  let invitationId = event.pathParameters.id;

  try {
    try {
      invitationId = makeIdSchema('invitationId').parse(invitationId);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    // access to the invitation is determined in a step further
    const invitationDocument = await getInvitation(currentUserId, invitationId);
    if (!invitationDocument) throw new Error('invitation_not_found');

    return response({
      code: 200,
      body: filterSensitiveProperties(invitationDocument),
    });
  } catch (error) {
    // TODO use a logger
    return response(errorMessage({ message: error.message }));
  }
};
