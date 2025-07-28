import { forumTopicReplyActionToggleLike } from '../lib/forumTopicReplyAction';
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

const urlActionsSchema = z.enum(['like']);

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  const {
    replyId,
    action: rawAction,
  } = event.pathParameters as {
    replyId: string;
    action: string;
  };

  try {
    const action = urlActionsSchema.parse(rawAction);
    let replyData = null;

    if (action === 'like') {
      replyData = await forumTopicReplyActionToggleLike(
        appId,
        replyId,
        userId
      );
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
