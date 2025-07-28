import {
  forumTopicActionSolve,
  forumTopicActionToggleLike,
  forumTopicActionView,
} from '../lib/forumTopicAction';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_FORUM_TOPIC_ACTION_CODE,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';

const urlActionsSchema = z.enum(['solve', 'like', 'view']);

const bodySolveSchema = z
  .object({
    solutionReplyId: z
      .string({
        required_error: 'solutionReplyId is required',
        invalid_type_error: 'solutionReplyId must be a string',
      })
      .trim()
      .min(1, 'solutionReplyId must be at least 1 character'),
  })
  .strict()
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const { topicId, action: rawAction } = event.pathParameters as {
    topicId: string;
    action: string;
  };

  try {
    const action = urlActionsSchema.parse(rawAction);
    let replyData = null;

    if (action === 'solve') {
      if (!event.body) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_BODY_CODE,
          `Body is missing from the request`
        );
      }
      // Validate the body of the request
      const body = JSON.parse(event.body);

      const { solutionReplyId } = bodySolveSchema.parse(body);

      replyData = await forumTopicActionSolve(
        appId,
        topicId,
        userId,
        solutionReplyId
      );
    } else if (action === 'like') {
      replyData = await forumTopicActionToggleLike(appId, topicId, userId);
    } else if (action === 'view') {
      replyData = await forumTopicActionView(appId, topicId, userId);
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_FORUM_TOPIC_ACTION_CODE,
        `Invalid forum action ${rawAction}`
      );
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: replyData,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
