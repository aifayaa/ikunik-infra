import {
  forumTopicReplyActionModerate,
  forumTopicReplyActionReport,
  forumTopicReplyActionToggleLike,
} from '../lib/forumTopicReplyAction';
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
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '@libs/perms/checkPermsFor';
import { parseAPIRequestBody } from '@libs/httpRequests/requestParsing';
import { getUserLanguage } from '@libs/intl/intl';

const urlActionsSchema = z.enum(['like', 'report']);

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

  const { replyId, action: rawAction } = event.pathParameters as {
    replyId: string;
    action: string;
  };

  try {
    const action = urlActionsSchema.parse(rawAction);
    let replyData = null;

    if (action === 'like') {
      replyData = await forumTopicReplyActionToggleLike(appId, replyId, userId);
    } else if (action === 'report') {
      const { reason } = parseAPIRequestBody(bodyReportSchema, event.body);

      const lang = getUserLanguage(event.headers);

      replyData = await forumTopicReplyActionReport(appId, replyId, userId, {
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

      replyData = await forumTopicReplyActionModerate(appId, replyId, userId, {
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
