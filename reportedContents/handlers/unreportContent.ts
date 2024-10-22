/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import unreportContent from '../lib/unreportContent';
import response, { handleException } from '@libs/httpResponses/response';
import { reportType, reportTypes } from 'reportedContents/lib/type';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_ARGUMENT_VALUE_CODE,
} from '@libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { id: contentId, type } = event.pathParameters as {
    id: string;
    type: reportType;
  };
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { appId } = event.requestContext.authorizer as { appId: string };

  try {
    if (!reportTypes.includes(type)) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_ARGUMENT_VALUE_CODE,
        `The type parameter '${type}' must have one of the following value: ${reportTypes.join(', ')}`
      );
    }

    const results = await unreportContent(userId, type, contentId, { appId });

    return response({ code: 200, body: formatResponseBody({ data: results }) });
  } catch (exception) {
    return handleException(exception);
  }
};
