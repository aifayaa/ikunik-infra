/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors.ts';
import { invitationAction } from '../lib/invitationAction';
import { invitationActionSchema } from '../schemas/invitationAction.schema';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { makeIdSchema } from '../../libs/schemas/makeIdSchema';

export default async (event) => {
  const { principalId: currentUserId } = event.requestContext.authorizer;
  let invitationId = event.pathParameters.id;
  const { action } = event.pathParameters;

  try {
    // should contain the challengeCode
    let parameters = JSON.parse(event.body) || {};
    parameters.action = action;

    // validation
    try {
      invitationId = makeIdSchema('invitationId').parse(invitationId);

      parameters = invitationActionSchema.parse(parameters);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    // current user right to update an invitation is determined in a step further
    const modifiedCount = await invitationAction(
      currentUserId,
      invitationId,
      parameters
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          modifiedCount,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
