/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { resendInvitation } from '../lib/resendInvitation';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { makeIdSchema } from '../../libs/schemas/makeIdSchema';

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

    // current user right to resend the invitation is determined in a step further
    await resendInvitation(currentUserId, invitationId);

    return response({ code: 200, message: 'invitation_resent_successfully' });
  } catch (error) {
    // TODO use a logger
    return response(errorMessage({ message: error.message }));
  }
};
