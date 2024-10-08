/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import deleteWebsite from '../lib/deleteWebsite';
import response, { handleException } from '../../libs/httpResponses/response';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getWebsite from 'websites/lib/getWebsite';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: websiteId } = event.pathParameters as {
    id: string;
  };

  try {
    const website = await getWebsite(websiteId);

    if (website.appId) {
      await checkPermsForApp(userId, website.appId, ['admin']);
    }

    const data = await deleteWebsite(website);

    return response({
      code: 200,
      body: formatResponseBody({
        data,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
