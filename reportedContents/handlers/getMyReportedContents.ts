import { APIGatewayProxyEvent } from 'aws-lambda';
import getMyReportedContents from '../lib/getMyReportedContents';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { appId } = event.requestContext.authorizer as { appId: string };

  try {
    const results = await getMyReportedContents(userId, { appId });

    return response({ code: 200, body: formatResponseBody({ data: results }) });
  } catch (exception) {
    return handleException(exception);
  }
};
