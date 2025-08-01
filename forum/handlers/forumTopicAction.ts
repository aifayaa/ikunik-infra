import {
  forumTopicActionModerate,
  forumTopicActionReport,
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
import { parseAPIRequestBody } from '@libs/httpRequests/requestParsing';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '@libs/perms/checkPermsFor';
import { getUserLanguage } from '@libs/intl/intl';

const urlActionsSchema = z.enum([
  'solve',
  'like',
  'view',
  'report',
  'moderate',
]);

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

const bodyReportSchema = z
  .object({
    reason: z
      .string({
        required_error: 'reason is required',
        invalid_type_error: 'reason must be a string',
      })
      .trim()
      .min(1, 'reason must be at least 1 character'),
  })
  .strict()
  .required();

const bodyModerateSchema = z
  .object({
    contentIs: z.enum(['valid', 'invalid']),
    actions: z
      .object({
        deleteUser: z.boolean().optional(),
        removeElement: z.boolean().optional(),
        deleteContent: z.boolean().optional(),
      })
      .strict(),
    reason: z
      .string({
        invalid_type_error: 'reason must be a string',
      })
      .trim()
      .optional(),
  })
  .strict();

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
      const { solutionReplyId } = parseAPIRequestBody(
        bodySolveSchema,
        event.body
      );

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
    } else if (action === 'report') {
      const { reason } = parseAPIRequestBody(bodyReportSchema, event.body);

      const lang = getUserLanguage(event.headers);

      replyData = await forumTopicActionReport(appId, topicId, userId, {
        reason,
        lang,
      });
    } else if (action === 'moderate') {
      try {
        await checkFeaturePermsForApp(userId, appId, ['forumAdmin']);
      } catch (e) {
        await checkPermsForApp(userId, appId, ['admin']);
      }

      const {
        contentIs,
        actions,
        reason = '',
      } = parseAPIRequestBody(bodyModerateSchema, event.body);

      replyData = await forumTopicActionModerate(appId, topicId, userId, {
        actions,
        contentIs,
        reason,
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
