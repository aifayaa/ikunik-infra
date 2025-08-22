/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import getLiveStreamRecordingMessages from 'appLiveStreams/lib/getLiveStreamRecordingMessages';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_INPUT_FORMAT_CODE,
  MISSING_QUERY_PARAMETERS_CODE,
} from '@libs/httpResponses/errorCodes';
import { z } from 'zod';

function strToDate(val: string) {
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) {
    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      INVALID_INPUT_FORMAT_CODE,
      'Invalid format for date input'
    );
  }

  return date;
}
function strToInt(val: string) {
  const int = parseInt(val, 10);
  if (Number.isNaN(int)) {
    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      INVALID_INPUT_FORMAT_CODE,
      'Invalid format for integer input'
    );
  }

  return int;
}

const querySchema = z
  .object({
    fromTime: z
      .string({
        required_error: 'fromTime is required',
        invalid_type_error: 'fromTime must be a string',
      })
      .transform(strToDate),
    toTime: z
      .string({
        required_error: 'toTime is required',
        invalid_type_error: 'toTime must be a string',
      })
      .transform(strToDate),
    limit: z
      .string({
        required_error: 'limit is required',
        invalid_type_error: 'limit must be a string',
      })
      .transform(strToInt),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId } = event.requestContext.authorizer as {
      appId: string;
    };
    const { id: liveStreamId } = event.pathParameters as { id: string };
    const { fromTime, toTime, limit } = querySchema.parse(
      event.queryStringParameters || {}
    );

    const messagesData = await getLiveStreamRecordingMessages(
      appId,
      liveStreamId,
      { fromTime, toTime, limit }
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: messagesData,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
