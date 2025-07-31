import { forumUserActionReport } from '../lib/forumUserAction';
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

const urlActionsSchema = z.enum(['report']);

const bodyReportSchema = z
  .object({
    reason: z
      .string({
        required_error: 'reason is required',
        invalid_type_error: 'reason must be a string',
      })
      .trim()
      .min(1, 'reason must be at least 1 character'),
    topicId: z
      .string({
        invalid_type_error: 'topicId must be a string',
      })
      .trim()
      .min(1, 'topicId must be at least 1 character'),
    topicReplyId: z
      .string({
        invalid_type_error: 'topicReplyId must be a string',
      })
      .trim()
      .min(1, 'topicReplyId must be at least 1 character'),
  })
  .strict()
  .required()
  .partial({ topicId: true, topicReplyId: true });

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const { userId: targetUserId, action: rawAction } = event.pathParameters as {
    userId: string;
    action: string;
  };

  try {
    const action = urlActionsSchema.parse(rawAction);
    let replyData = null;

    if (action === 'report') {
      if (!event.body) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_BODY_CODE,
          'Body is missing from the request'
        );
      }
      // Validate the body of the request
      const body = JSON.parse(event.body);

      const { reason, topicId, topicReplyId } = bodyReportSchema.parse(body);

      replyData = await forumUserActionReport(appId, targetUserId, userId, {
        reason,
        topicId,
        topicReplyId,
      });
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
