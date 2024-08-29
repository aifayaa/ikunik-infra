/* eslint-disable import/no-relative-packages */
import { z } from 'zod';

import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ExtensionType } from '../lib/type';
import downloadBundle from '../lib/downloadBundle';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

/**
 * Generate a temporary URL to download bundle files.
 */
export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { id: appId } = event.pathParameters as {
    id: string;
  };

  const extensions = ['apk', 'aab', 'ipa'] as ExtensionType[];

  try {
    await checkPermsForApp(userId, appId, ['viewer']);

    const downloadBundleSchema = z
      .object({
        extension: z.enum(extensions as [string, ...string[]]),
      })
      .required();

    const parameters = event.queryStringParameters;

    const validatedParameters = downloadBundleSchema.parse(parameters) as {
      extension: ExtensionType;
    };

    const validityDuration = 3600;
    const url = await downloadBundle(
      appId,
      validityDuration,
      validatedParameters
    );

    const now = Date.now();
    const timestampExpiration = new Date(now + 3600 * 1000);

    return response({
      code: 200,
      body: formatResponseBody({
        data: { url, expiresAt: timestampExpiration.toISOString() },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
