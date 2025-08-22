/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import getLiveStreamRecordingViewingParameters from 'appLiveStreams/lib/getLiveStreamRecordingViewingParameters';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';

const querySchema = z
  .object({
    recordingId: z.string({
      required_error: 'recordingId is required',
      invalid_type_error: 'recordingId must be a string',
    }),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId } = event.requestContext.authorizer as {
      appId: string;
    };
    const { id: liveStreamId } = event.pathParameters as { id: string };
    const { recordingId } = querySchema.parse(
      event.queryStringParameters || {}
    );

    const viewingParams = await getLiveStreamRecordingViewingParameters(
      appId,
      liveStreamId,
      recordingId
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: viewingParams,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
